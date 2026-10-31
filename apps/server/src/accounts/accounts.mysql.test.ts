import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance, LightMyRequestResponse } from 'fastify'
import { OAuth2Client } from 'google-auth-library'
import { randomUUID } from 'node:crypto'
import { newCampaign } from '@lcg/cards'
import { session } from '@lcg/saves'
import { buildApp } from '../app'
import { migrate } from './database'
import { isolatedMysqlDatabase } from './mysql-test-database'
import type { AccountMail } from './mail'
import { provisionAdmin } from './admin'
import { hashPassword, verifyPassword } from './security'

const url = process.env.MYSQL_TEST_URL
describe.skipIf(!url)('cuentas y bibliotecas con MySQL real', () => {
  const origin = 'http://localhost:5173'
  let app: FastifyInstance,
    db: Awaited<ReturnType<typeof isolatedMysqlDatabase>>,
    mails: AccountMail[]
  const password = 'a correct long password'
  const post = (path: string, payload: unknown, cookie?: string, csrf?: string) =>
    app.inject({
      method: 'POST',
      url: `/api${path}`,
      payload: JSON.stringify(payload),
      headers: {
        origin,
        'content-type': 'application/json',
        ...(cookie ? { cookie } : {}),
        ...(csrf ? { 'x-csrf-token': csrf } : {}),
      },
    })
  const cookieOf = (r: LightMyRequestResponse) =>
    r.cookies
      .filter((c) => c.name === 'lcg-session')
      .map((c) => `${c.name}=${c.value}`)
      .join('; ')
  const tokenFrom = (mail: AccountMail) =>
    new URLSearchParams(new URL(mail.text.match(/^https?:\/\/\S+$/m)![0]).hash.slice(1)).get(
      'token',
    )!
  async function user(address = `${randomUUID()}@example.com`) {
    expect(
      (
        await post('/auth/register', {
          email: address,
          password,
          name: 'Investigadora',
          locale: 'es',
        })
      ).statusCode,
    ).toBe(200)
    const mail = mails.findLast((m) => m.to === address)!
    expect((await post('/auth/verify-email', { token: tokenFrom(mail) })).statusCode).toBe(200)
    const login = await post('/auth/login', { email: address, password })
    expect(login.statusCode).toBe(200)
    return { address, cookie: cookieOf(login), csrf: login.json().csrf, id: login.json().user.id }
  }
  const deck = () => ({
    id: 'local-deck',
    name: 'My deck',
    investigator: '12004',
    cards: ['12005'],
  })
  const write = (payload: unknown = deck()) => ({
    kind: 'deck',
    name: 'Saved deck',
    revision: 0,
    operationId: randomUUID(),
    payload,
    archived: false,
    deleted: false,
  })
  const put = (id: string, body: unknown, auth: { cookie: string; csrf: string }) =>
    app.inject({
      method: 'PUT',
      url: `/api/library/${id}`,
      payload: JSON.stringify(body),
      headers: {
        origin,
        'content-type': 'application/json',
        cookie: auth.cookie,
        'x-csrf-token': auth.csrf,
      },
    })
  beforeAll(async () => {
    if (!url || !new URL(url).pathname.endsWith('_test'))
      throw new Error('MYSQL_TEST_URL must target an isolated database ending in _test')
    db = await isolatedMysqlDatabase(url)
    await migrate(db.db)
  }, 30000)
  beforeEach(async () => {
    if (app) await app.close()
    vi.restoreAllMocks()
    await db.db.exec('DELETE FROM users')
    await db.db.exec('DELETE FROM oauth_requests')
    mails = []
    app = await buildApp({
      db: db.db,
      config: {
        databaseUrl: url!,
        origin,
        production: false,
        googleClientId: 'test-client',
        googleClientSecret: 'test-secret',
      },
      sendMail: async (mail) => {
        mails.push(mail)
      },
    })
  })
  afterAll(async () => {
    if (app) await app.close()
    if (db) await db.close()
    vi.restoreAllMocks()
  })

  it('crea un administrador verificado y no restablece su contraseña al repetir el aprovisionamiento', async () => {
    const address = 'admin@example.test'
    await provisionAdmin(db.db, { email: address, password })
    const login = await post('/auth/login', { email: address, password })
    expect(login.statusCode).toBe(200)
    expect(login.json().user).toMatchObject({ role: 'admin', verified: true })
    const me = await app.inject({ url: '/api/auth/me', headers: { cookie: cookieOf(login) } })
    expect(me.json().user.role).toBe('admin')
    const changed = await hashPassword('a different long password')
    await db.db.exec('UPDATE users SET password_hash = ? WHERE email = ?', [changed, address])
    await provisionAdmin(db.db, { email: address, password })
    const [stored] = await db.db.rows<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE email = ?',
      [address],
    )
    expect(await verifyPassword(stored!.password_hash, 'a different long password')).toBe(true)
    expect((await db.db.rows('SELECT user_id FROM account_roles')).length).toBe(1)
  })

  it('promueve una cuenta existente sin perder sus documentos y revoca credenciales anteriores', async () => {
    const existing = await user('existing@example.test')
    const id = randomUUID()
    expect((await put(id, write(), existing)).statusCode).toBe(200)
    await provisionAdmin(db.db, { email: existing.address, password: 'new administrator password' })
    expect(
      (await app.inject({ url: '/api/library', headers: { cookie: existing.cookie } })).statusCode,
    ).toBe(401)
    const login = await post('/auth/login', {
      email: existing.address,
      password: 'new administrator password',
    })
    expect(login.json().user.role).toBe('admin')
    const saved = await app.inject({
      url: `/api/library/${id}`,
      headers: { cookie: cookieOf(login) },
    })
    expect(saved.statusCode).toBe(200)
  })

  it('el registro público no permite elegir un rol administrador', async () => {
    const response = await post('/auth/register', {
      email: 'normal@example.test',
      password,
      name: 'Normal',
      role: 'admin',
    })
    // Fastify may remove unknown properties; either way no privileged role is persisted.
    expect([200, 400]).toContain(response.statusCode)
    expect(await db.db.rows('SELECT user_id FROM account_roles')).toEqual([])
    const normal = await user()
    const login = await post('/auth/login', { email: normal.address, password })
    expect(login.json().user.role).toBe('user')
  })

  it('aplica las migraciones numeradas de forma repetible sin cambiar la primera', async () => {
    await migrate(db.db)
    const versions = await db.db.rows<{ version: number }>(
      'SELECT version FROM schema_migrations ORDER BY version',
    )
    expect(versions.map((v) => v.version)).toEqual([1, 2, 3, 4])
    // The online migration must create a usable table, not just a version marker.
    expect(await db.db.rows('SELECT id, owner_id, payload FROM online_lobbies LIMIT 0')).toEqual([])
  })

  it('restringe el panel y consulta usuarios, sesiones y logs reales sin secretos', async () => {
    const ordinary = await user()
    expect((await app.inject('/api/admin/overview')).statusCode).toBe(401)
    expect(
      (await app.inject({ url: '/api/admin/users', headers: { cookie: ordinary.cookie } }))
        .statusCode,
    ).toBe(403)
    await provisionAdmin(db.db, { email: 'malkivian@gmail.com', password })
    const login = await post('/auth/login', { email: 'malkivian@gmail.com', password })
    const headers = { cookie: cookieOf(login) }
    await post('/auth/login', { email: ordinary.address, password: 'incorrect' })
    const summary = await app.inject({ url: '/api/admin/overview', headers })
    expect(summary.statusCode).toBe(200)
    expect(summary.json()).toMatchObject({ users: 2, verified: 2, sessions: 2, failedMail: 0 })
    const users = await app.inject({
      url: `/api/admin/users?search=${encodeURIComponent(ordinary.address)}`,
      headers,
    })
    expect(users.json().items).toHaveLength(1)
    expect(users.json().items[0]).toMatchObject({ email: ordinary.address, sessions: 1 })
    expect(Number(users.json().items[0].last_access)).toBeGreaterThan(0)
    expect(users.body).not.toContain('password_hash')
    const accesses = await app.inject({ url: '/api/admin/access', headers })
    expect(accesses.json().items).toHaveLength(3)
    expect(accesses.json().items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: ordinary.address, status: 'failed' }),
      ]),
    )
    const mail = await app.inject({ url: '/api/admin/mail', headers })
    expect(mail.json().items).toEqual([
      expect.objectContaining({ kind: 'mail_verify', status: 'success' }),
    ])
    expect(mail.body).not.toContain(tokenFrom(mails[0]!))
    await db.db.exec('DELETE FROM account_roles')
    expect((await app.inject({ url: '/api/admin/overview', headers })).statusCode).toBe(403)
  })

  it('permite reenviar y activar desde administración y acceder sin el enlace de correo', async () => {
    await provisionAdmin(db.db, { email: 'malkivian@gmail.com', password })
    const admin = await post('/auth/login', { email: 'malkivian@gmail.com', password })
    const address = 'pending-admin@example.test'
    expect(
      (await post('/auth/register', { email: address, password, name: 'Pending' })).statusCode,
    ).toBe(200)
    const [pending] = await db.db.rows<{ id: string }>('SELECT id FROM users WHERE email = ?', [
      address,
    ])
    expect((await post('/auth/login', { email: address, password })).statusCode).toBe(403)
    const action = (name: string) =>
      post(`/admin/users/${pending!.id}/${name}`, {}, cookieOf(admin), admin.json().csrf)
    expect((await action('resend-verification')).statusCode).toBe(200)
    expect(mails.filter((mail) => mail.to === address)).toHaveLength(2)
    expect((await action('activate')).statusCode).toBe(200)
    expect(
      await db.db.rows(
        "SELECT token_hash FROM account_tokens WHERE user_id = ? AND purpose = 'verify'",
        [pending!.id],
      ),
    ).toEqual([])
    const login = await post('/auth/login', { email: address, password })
    expect(login.statusCode).toBe(200)
    expect(login.json().user).toMatchObject({ verified: true, role: 'user' })
    expect((await action('resend-verification')).statusCode).toBe(409)
    expect((await post('/auth/verify-email', { token: tokenFrom(mails[0]!) })).statusCode).toBe(400)
  })

  it('registra fallos de correo y retira el token que no pudo enviarse', async () => {
    const normal = await user()
    await app.close()
    app = await buildApp({
      db: db.db,
      config: { databaseUrl: url!, origin, production: false },
      sendMail: async () => {
        throw new Error('SMTP secret must not be logged')
      },
    })
    expect((await post('/auth/forgot-password', { email: normal.address })).statusCode).toBe(503)
    expect(
      await db.db.rows("SELECT status FROM account_activity WHERE kind = 'mail_reset'"),
    ).toEqual([{ status: 'failed' }])
    expect(
      await db.db.rows("SELECT token_hash FROM account_tokens WHERE purpose = 'reset'"),
    ).toEqual([])
  })

  it('exige verificar correo; el enlace es de un uso y no inicia sesión automáticamente', async () => {
    const email = 'verify@example.com'
    await post('/auth/register', { email, password, name: 'Test' })
    expect((await post('/auth/login', { email, password })).json().code).toBe(
      'verification_required',
    )
    const raw = tokenFrom(mails[0]!)
    expect(
      (await db.db.rows('SELECT token_hash FROM account_tokens WHERE token_hash = ?', [raw]))
        .length,
    ).toBe(0)
    const verified = await post('/auth/verify-email', { token: raw })
    expect(verified.statusCode).toBe(200)
    expect(verified.cookies).toEqual([])
    expect((await post('/auth/verify-email', { token: raw })).json().code).toBe('invalid_token')
    const logged = await post('/auth/login', { email, password })
    expect(logged.statusCode).toBe(200)
    expect(logged.headers['set-cookie']).toContain('HttpOnly')
    expect(logged.headers['set-cookie']).toContain('SameSite=Lax')
    expect(logged.json().user.password_hash).toBeUndefined()
  })
  it('normaliza correos y no sustituye la contraseña de una cuenta registrada', async () => {
    const auth = await user('same@example.com')
    expect(
      (
        await post('/auth/register', {
          email: 'Same@Example.COM',
          password: 'another long password',
          name: 'Other',
        })
      ).statusCode,
    ).toBe(200)
    expect((await post('/auth/login', { email: auth.address, password })).statusCode).toBe(200)
    expect((await db.db.rows('SELECT id FROM users')).length).toBe(1)
  })
  it('rechaza origen ajeno y escrituras sin CSRF; permite volver a entrar con cookie vencida', async () => {
    const auth = await user()
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/auth/logout',
          headers: { origin: 'https://evil.example', cookie: auth.cookie },
        })
      ).statusCode,
    ).toBe(403)
    expect((await post('/auth/logout', {}, auth.cookie)).statusCode).toBe(403)
    await db.db.exec('UPDATE auth_sessions SET expires_at = 0')
    expect(
      (await post('/auth/login', { email: auth.address, password }, auth.cookie)).statusCode,
    ).toBe(200)
  })
  it('recupera contraseña, verifica control del correo y revoca sesiones y tokens anteriores', async () => {
    const auth = await user()
    await post('/auth/forgot-password', { email: auth.address })
    const raw = tokenFrom(mails.at(-1)!)
    expect(
      (await post('/auth/reset-password', { token: raw, password: 'replacement long password' }))
        .statusCode,
    ).toBe(200)
    expect(
      (await app.inject({ url: '/api/auth/me', headers: { cookie: auth.cookie } })).json().user,
    ).toBeNull()
    expect((await post('/auth/login', { email: auth.address, password })).statusCode).toBe(401)
    expect(
      (await post('/auth/login', { email: auth.address, password: 'replacement long password' }))
        .statusCode,
    ).toBe(200)
    expect((await post('/auth/reset-password', { token: raw, password })).statusCode).toBe(400)
  })
  it('rechaza enlaces caducados y devuelve la misma respuesta para recuperación inexistente', async () => {
    const auth = await user()
    const exists = await post('/auth/forgot-password', { email: auth.address })
    const missing = await post('/auth/forgot-password', { email: 'nobody@example.com' })
    expect(exists.json()).toEqual(missing.json())
    const raw = tokenFrom(mails.at(-1)!)
    await db.db.exec('UPDATE account_tokens SET expires_at = 0')
    expect((await post('/auth/reset-password', { token: raw, password })).json().code).toBe(
      'invalid_token',
    )
  })
  it('aisla lectura, escritura, revisiones y exportación entre usuarios', async () => {
    const a = await user(),
      b = await user(),
      id = randomUUID()
    expect((await put(id, write(), a)).statusCode).toBe(200)
    expect(
      (await app.inject({ url: `/api/library/${id}`, headers: { cookie: b.cookie } })).statusCode,
    ).toBe(404)
    expect(
      (await app.inject({ url: `/api/library/${id}/revisions`, headers: { cookie: b.cookie } }))
        .statusCode,
    ).toBe(404)
    expect((await put(id, { ...write(), revision: 1 }, b)).statusCode).toBe(409)
    expect(
      (await app.inject({ url: '/api/me/export', headers: { cookie: b.cookie } })).json().documents,
    ).toEqual([])
    expect(
      (await app.inject({ url: '/api/library', headers: { cookie: a.cookie } })).json().documents,
    ).toHaveLength(1)
  })
  it('guarda borradores, detecta concurrencia e identifica reintentos sin duplicar', async () => {
    const auth = await user(),
      id = randomUUID(),
      input = write()
    const results = await Promise.all([put(id, input, auth), put(id, input, auth)])
    expect(results.map((r) => r.statusCode)).toEqual([200, 200])
    expect(results.map((r) => r.json().revision)).toEqual([1, 1])
    const changes = await Promise.all([
      put(id, { ...input, revision: 1, name: 'A', operationId: randomUUID() }, auth),
      put(id, { ...input, revision: 1, name: 'B', operationId: randomUUID() }, auth),
    ])
    expect(changes.map((r) => r.statusCode).sort()).toEqual([200, 409])
    expect((await put(id, { ...input, name: 'Reused' }, auth)).json().code).toBe('operation_reused')
    expect(
      (await app.inject({ url: `/api/library/${id}`, headers: { cookie: auth.cookie } })).json()
        .revision,
    ).toBe(2)
  })
  it('conserva campañas independientes, historial y revisiones recuperables', async () => {
    const auth = await user(),
      id = randomUUID()
    const payload = session(null, null, newCampaign('brethren-of-ash', ['joe'], 'easy'), [])
    const input = { ...write(payload), kind: 'campaign' }
    expect((await put(id, input, auth)).statusCode).toBe(200)
    expect(
      (await put(randomUUID(), { ...input, operationId: randomUUID() }, auth)).statusCode,
    ).toBe(200)
    for (let revision = 1; revision <= 6; revision++)
      expect(
        (await put(id, { ...input, revision, operationId: randomUUID() }, auth)).statusCode,
      ).toBe(200)
    expect(
      (
        await app.inject({ url: `/api/library/${id}/revisions`, headers: { cookie: auth.cookie } })
      ).json().revisions,
    ).toHaveLength(5)
    expect(
      (
        await app.inject({
          url: `/api/library/${id}/revisions/7`,
          headers: { cookie: auth.cookie },
        })
      ).json().payload,
    ).toEqual(payload)
    expect(
      (await put(randomUUID(), { ...input, payload: { ...payload, version: 99 } }, auth)).json()
        .code,
    ).toBe('invalid_save')
  })
  it('rechaza cartas desconocidas y devuelve tumbas para no resucitar borrados', async () => {
    const auth = await user(),
      id = randomUUID()
    expect((await put(id, write({ ...deck(), cards: ['unknown'] }), auth)).statusCode).toBe(400)
    await put(id, write(), auth)
    expect((await put(id, { ...write(), revision: 1, deleted: true }, auth)).statusCode).toBe(200)
    expect(
      (await app.inject({ url: `/api/library/${id}`, headers: { cookie: auth.cookie } }))
        .statusCode,
    ).toBe(404)
    expect(
      (await app.inject({ url: '/api/library', headers: { cookie: auth.cookie } })).json()
        .documents[0].deleted,
    ).toBe(true)
  })
  it('cierra sesión y elimina cuentas solo tras confirmar contraseña', async () => {
    const auth = await user(),
      id = randomUUID()
    await put(id, write(), auth)
    const remove = (password: string) =>
      app.inject({
        method: 'DELETE',
        url: '/api/me',
        payload: { password },
        headers: { origin, cookie: auth.cookie, 'x-csrf-token': auth.csrf },
      })
    expect((await remove('wrong')).statusCode).toBe(403)
    expect((await remove(password)).statusCode).toBe(200)
    expect((await db.db.rows('SELECT id FROM documents')).length).toBe(0)
    expect(
      (await app.inject({ url: '/api/auth/me', headers: { cookie: auth.cookie } })).json().user,
    ).toBeNull()
  })
  /** Google sign-in with the given claims; returns the final redirect and its cookies. */
  async function googleSignIn(claims: Record<string, unknown>) {
    vi.spyOn(OAuth2Client.prototype, 'getToken').mockResolvedValue({
      tokens: { id_token: 'signed' },
    } as never)
    let nonce = ''
    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockImplementation(
      async () => ({ getPayload: () => ({ ...claims, nonce }) }) as never,
    )
    const begin = await app.inject({ url: '/api/auth/google' })
    const location = new URL(String(begin.headers.location))
    nonce = location.searchParams.get('nonce')!
    const response = await app.inject({
      url: `/api/auth/google/callback?code=code&state=${location.searchParams.get('state')}`,
      headers: { cookie: begin.cookies.map((c) => `${c.name}=${c.value}`).join('; ') },
    })
    return { location: String(response.headers.location), cookie: cookieOf(response) }
  }
  it('Google entra en la cuenta existente con el mismo correo cuando Google lo garantiza', async () => {
    const auth = await user('same@gmail.com')
    const signIn = await googleSignIn({
      sub: 'google-same',
      email: 'same@gmail.com',
      email_verified: true,
      name: 'Google',
    })
    expect(signIn.location).toContain('google=ok')
    const me = await app.inject({ url: '/api/auth/me', headers: { cookie: signIn.cookie } })
    expect(me.json().user.id).toBe(auth.id)
    expect((await db.db.rows('SELECT id FROM users')).length).toBe(1)
    // The verified account keeps its password.
    expect((await post('/auth/login', { email: 'same@gmail.com', password })).statusCode).toBe(200)
  })
  it('una cuenta sin verificar con ese correo pierde la contraseña al entrar con Google', async () => {
    // Someone registered the address first without access to the mailbox.
    await post('/auth/register', {
      email: 'victim@gmail.com',
      password,
      name: 'Otra persona',
      locale: 'es',
    })
    const signIn = await googleSignIn({
      sub: 'google-victim',
      email: 'victim@gmail.com',
      email_verified: true,
    })
    expect(signIn.location).toContain('google=ok')
    expect((await post('/auth/login', { email: 'victim@gmail.com', password })).statusCode).toBe(
      401,
    )
    const [row] = await db.db.rows<{ verified: number }>(
      'SELECT verified FROM users WHERE email = ?',
      ['victim@gmail.com'],
    )
    expect(Number(row!.verified)).toBe(1)
  })
  it('sin garantía de Google sobre el correo no une la cuenta existente', async () => {
    await user('owner@example.com')
    for (const claims of [
      { sub: 'google-unverified', email: 'owner@example.com', email_verified: false },
      // Verified, but not Gmail nor a Workspace domain (no hd): Google does not own it.
      { sub: 'google-foreign', email: 'owner@example.com', email_verified: true },
    ])
      expect((await googleSignIn(claims)).location).toContain('google_link_required')
    expect((await db.db.rows('SELECT subject FROM auth_identities')).length).toBe(0)
  })
  it('Google valida nonce y permite vincular desde Mi cuenta', async () => {
    const auth = await user('google@example.com')
    const getToken = vi
      .spyOn(OAuth2Client.prototype, 'getToken')
      .mockResolvedValue({ tokens: { id_token: 'signed' } } as never)
    let nonce = ''
    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockImplementation(
      async () =>
        ({
          getPayload: () => ({
            sub: 'google-identity',
            email: 'google@example.com',
            email_verified: true,
            nonce,
            name: 'Google',
          }),
        }) as never,
    )
    const link = await app.inject({
      url: '/api/auth/google?link=1',
      headers: { cookie: auth.cookie },
    })
    const linkLocation = new URL(String(link.headers.location))
    nonce = linkLocation.searchParams.get('nonce')!
    const linked = await app.inject({
      url: `/api/auth/google/callback?code=code&state=${linkLocation.searchParams.get('state')}`,
      headers: {
        cookie: `${auth.cookie}; ${link.cookies.map((c) => `${c.name}=${c.value}`).join('; ')}`,
      },
    })
    expect(linked.headers.location).toContain('google=ok')
    expect(getToken).toHaveBeenCalled()
    expect((await db.db.rows('SELECT id FROM users')).length).toBe(1)
    expect((await db.db.rows('SELECT subject FROM auth_identities')).length).toBe(1)
  })
})
