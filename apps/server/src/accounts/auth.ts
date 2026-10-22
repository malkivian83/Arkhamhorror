import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { OAuth2Client, CodeChallengeMethod } from 'google-auth-library'
import { randomUUID } from 'node:crypto'
import type { Database } from './database'
import type { AccountConfig } from './config'
import type { SendMail } from './mail'
import { recordActivity } from './activity'
import {
  ApiError,
  csrfFor,
  digest,
  equal,
  hashPassword,
  requireValue,
  token,
  verifyPassword,
} from './security'

export interface User {
  id: string
  email: string
  name: string
  locale: string
  verified: number
  role?: 'user' | 'admin'
  password_hash?: string | null
}
export const publicUser = (u: User) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  locale: u.locale,
  verified: !!u.verified,
  role: u.role ?? 'user',
})
const DAY = 86400000
export const authSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    email: {
      type: 'string',
      minLength: 3,
      maxLength: 254,
      pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
    },
    password: { type: 'string', minLength: 12, maxLength: 128 },
    name: { type: 'string', minLength: 1, maxLength: 100 },
    locale: { type: 'string', enum: ['es', 'en'] },
  },
}

export function authentication(
  app: FastifyInstance,
  db: Database,
  config: AccountConfig,
  sendMail: SendMail,
) {
  const cookieName = config.production ? '__Host-lcg-session' : 'lcg-session'
  const cookieOptions = {
    httpOnly: true,
    secure: config.production,
    sameSite: 'lax' as const,
    path: '/',
  }
  const googleEnabled = !!(config.googleClientId && config.googleClientSecret)
  const google = new OAuth2Client({
    clientId: config.googleClientId ?? '',
    clientSecret: config.googleClientSecret ?? '',
    redirectUri: `${config.origin}/api/auth/google/callback`,
  })
  const limited = { rateLimit: { max: 10, timeWindow: '10 minutes' } }
  const email = (v: string) => v.trim().toLowerCase()

  async function current(req: FastifyRequest): Promise<User | null> {
    const raw = req.cookies[cookieName]
    if (!raw || raw.length > 128) return null
    const [user] = await db.rows<User>(
      "SELECT u.id, u.email, u.name, u.locale, u.verified, COALESCE(r.role, 'user') AS role FROM auth_sessions s JOIN users u ON u.id = s.user_id LEFT JOIN account_roles r ON r.user_id = u.id WHERE s.token_hash = ? AND s.expires_at > ? AND s.last_used_at > ?",
      [digest(raw), Date.now(), Date.now() - 7 * DAY],
    )
    if (!user) return null
    await db.exec('UPDATE auth_sessions SET last_used_at = ? WHERE token_hash = ?', [
      Date.now(),
      digest(raw),
    ])
    return user
  }
  async function requireUser(req: FastifyRequest) {
    const user = await current(req)
    requireValue(user, 'unauthorized', 401)
    requireValue(user.verified, 'verification_required', 403)
    requireValue(
      !req.headers['x-account-id'] || req.headers['x-account-id'] === user.id,
      'account_changed',
      401,
    )
    return user
  }
  async function protect(req: FastifyRequest) {
    requireValue(req.headers.origin === config.origin, 'origin', 403)
    if (req.cookies[cookieName] && (await current(req)))
      requireValue(
        equal(String(req.headers['x-csrf-token'] ?? ''), csrfFor(req.cookies[cookieName]!)),
        'csrf',
        403,
      )
  }
  async function session(user: User, reply: FastifyReply, kind: 'login_password' | 'login_google') {
    const [role] = await db.rows<{ role: 'admin' }>(
      'SELECT role FROM account_roles WHERE user_id = ?',
      [user.id],
    )
    const raw = token()
    await db.transaction(async (tx) => {
      await tx.exec(
        'INSERT INTO auth_sessions (token_hash, user_id, expires_at, last_used_at) VALUES (?, ?, ?, ?)',
        [digest(raw), user.id, Date.now() + 30 * DAY, Date.now()],
      )
      await recordActivity(tx, user.id, kind, 'success')
    })
    reply.setCookie(cookieName, raw, { ...cookieOptions, maxAge: 30 * 86400 })
    return { user: publicUser({ ...user, role: role?.role ?? 'user' }), csrf: csrfFor(raw) }
  }
  async function issue(user: User, purpose: 'verify' | 'reset') {
    const raw = token()
    const hash = digest(raw)
    await db.exec(
      'INSERT INTO account_tokens (token_hash, user_id, purpose, expires_at) VALUES (?, ?, ?, ?)',
      [hash, user.id, purpose, Date.now() + (purpose === 'verify' ? DAY : 30 * 60000)],
    )
    const link = new URL('/account', config.origin)
    // Fragment prevents tokens appearing in proxy request logs or Referer headers.
    link.hash = new URLSearchParams({ action: purpose, token: raw }).toString()
    const spanish = user.locale !== 'en'
    const activityId = await recordActivity(
      db,
      user.id,
      purpose === 'verify' ? 'mail_verify' : 'mail_reset',
      'pending',
    )
    try {
      await sendMail({
        to: user.email,
        subject:
          purpose === 'verify'
            ? spanish
              ? 'Verifica tu cuenta de Arkham'
              : 'Verify your Arkham account'
            : spanish
              ? 'Recupera tu cuenta de Arkham'
              : 'Reset your Arkham password',
        text: `${spanish ? 'Abre este enlace para continuar' : 'Open this link to continue'}:\n${link.href}\n\n${spanish ? 'Si no lo has solicitado, ignora este correo.' : 'If you did not request this, ignore this email.'}`,
      })
    } catch {
      await db.exec("UPDATE account_activity SET status = 'failed' WHERE id = ?", [activityId])
      await db.exec('DELETE FROM account_tokens WHERE token_hash = ?', [hash])
      throw new ApiError('mail_unavailable', 503)
    }
    await db.exec("UPDATE account_activity SET status = 'success' WHERE id = ?", [activityId])
  }
  async function consume(
    raw: string,
    purpose: string,
    change: (transaction: Database, userId: string) => Promise<unknown>,
  ) {
    await db.transaction(async (tx) => {
      const [entry] = await tx.rows<{ user_id: string }>(
        'SELECT user_id FROM account_tokens WHERE token_hash = ? AND purpose = ? AND expires_at > ? FOR UPDATE',
        [digest(raw), purpose, Date.now()],
      )
      requireValue(entry, 'invalid_token')
      await change(tx, entry.user_id)
      await tx.exec('DELETE FROM account_tokens WHERE user_id = ? AND purpose = ?', [
        entry.user_id,
        purpose,
      ])
    })
  }
  const tokenSchema = {
    type: 'object',
    required: ['token'],
    additionalProperties: false,
    properties: { token: { type: 'string', minLength: 20, maxLength: 128 } },
  }

  app.addHook('onRequest', async (req, reply) => {
    if (!req.url.startsWith('/api/')) return
    reply.header('Cache-Control', 'no-store').header('Referrer-Policy', 'no-referrer')
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) await protect(req)
  })
  app.get('/api/auth/me', async (req) => {
    const user = await current(req)
    return {
      user: user ? publicUser(user) : null,
      csrf: user ? csrfFor(req.cookies[cookieName]!) : null,
      enabled: true,
      google: googleEnabled,
    }
  })
  app.post<{ Body: { email: string; password: string; name: string; locale?: string } }>(
    '/api/auth/register',
    {
      config: limited,
      schema: { body: { ...authSchema, required: ['email', 'password', 'name'] } },
    },
    async (req) => {
      const body = req.body
      requireValue(body.name.trim(), 'invalid')
      const password = await hashPassword(body.password)
      const id = randomUUID()
      await db.exec(
        'INSERT IGNORE INTO users (id, email, name, password_hash, locale, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, email(body.email), body.name.trim(), password, body.locale ?? 'es', Date.now()],
      )
      const [user] = await db.rows<User>('SELECT * FROM users WHERE email = ?', [email(body.email)])
      if (user && !user.verified) await issue(user, 'verify')
      return { ok: true }
    },
  )
  // Login accepts old/short passwords only as input; creation/reset always enforce 12+ characters.
  app.post<{ Body: { email: string; password: string } }>(
    '/api/auth/login',
    {
      config: limited,
      schema: {
        body: {
          ...authSchema,
          required: ['email', 'password'],
          properties: {
            ...authSchema.properties,
            password: { type: 'string', minLength: 1, maxLength: 128 },
          },
        },
      },
    },
    async (req, reply) => {
      const [user] = await db.rows<User>('SELECT * FROM users WHERE email = ?', [
        email(req.body.email),
      ])
      const encoded = user?.password_hash ?? (await dummyHash)
      const valid = await verifyPassword(encoded, req.body.password)
      if (user && (!user.password_hash || !valid || !user.verified))
        await recordActivity(db, user.id, 'login_password', 'failed')
      requireValue(user && user.password_hash && valid, 'invalid_credentials', 401)
      requireValue(user.verified, 'verification_required', 403)
      if (req.cookies[cookieName])
        await db.exec('DELETE FROM auth_sessions WHERE token_hash = ?', [
          digest(req.cookies[cookieName]!),
        ])
      return session(user, reply, 'login_password')
    },
  )
  const dummyHash = hashPassword(token())
  app.post('/api/auth/logout', async (req, reply) => {
    if (req.cookies[cookieName])
      await db.exec('DELETE FROM auth_sessions WHERE token_hash = ?', [
        digest(req.cookies[cookieName]!),
      ])
    reply.clearCookie(cookieName, cookieOptions)
    return { ok: true }
  })
  app.post<{ Body: { token: string } }>(
    '/api/auth/verify-email',
    { config: limited, schema: { body: tokenSchema } },
    async (req) => {
      await consume(req.body.token, 'verify', (tx, id) =>
        tx.exec('UPDATE users SET verified = TRUE WHERE id = ?', [id]),
      )
      return { ok: true }
    },
  )
  for (const [path, purpose] of [
    ['resend-verification', 'verify'],
    ['forgot-password', 'reset'],
  ] as const) {
    app.post<{ Body: { email: string } }>(
      `/api/auth/${path}`,
      {
        config: limited,
        schema: {
          body: {
            type: 'object',
            required: ['email'],
            additionalProperties: false,
            properties: { email: authSchema.properties.email },
          },
        },
      },
      async (req) => {
        const [user] = await db.rows<User>('SELECT * FROM users WHERE email = ?', [
          email(req.body.email),
        ])
        if (user && (purpose === 'reset' || !user.verified)) await issue(user, purpose)
        return { ok: true }
      },
    )
  }
  app.post<{ Body: { token: string; password: string } }>(
    '/api/auth/reset-password',
    {
      config: limited,
      schema: {
        body: {
          ...tokenSchema,
          required: ['token', 'password'],
          properties: { ...tokenSchema.properties, password: authSchema.properties.password },
        },
      },
    },
    async (req) => {
      const password = await hashPassword(req.body.password)
      await consume(req.body.token, 'reset', async (tx, id) => {
        await tx.exec('UPDATE users SET password_hash = ?, verified = TRUE WHERE id = ?', [
          password,
          id,
        ])
        await tx.exec('DELETE FROM auth_sessions WHERE user_id = ?', [id])
      })
      return { ok: true }
    },
  )

  app.get<{ Querystring: { link?: string } }>(
    '/api/auth/google',
    { config: limited },
    async (req, reply) => {
      requireValue(googleEnabled, 'google_unavailable', 503)
      const user = req.query.link === '1' ? await requireUser(req) : null
      const state = token(),
        nonce = token(),
        verifier = token()
      await db.exec(
        'INSERT INTO oauth_requests (state_hash, nonce, verifier, user_id, expires_at) VALUES (?, ?, ?, ?, ?)',
        [digest(state), nonce, verifier, user?.id ?? null, Date.now() + 600000],
      )
      reply.setCookie('lcg-oauth', state, { ...cookieOptions, maxAge: 600 })
      return reply.redirect(
        google.generateAuthUrl({
          scope: ['openid', 'email', 'profile'],
          state,
          nonce,
          code_challenge: Buffer.from(digest(verifier), 'hex').toString('base64url'),
          code_challenge_method: CodeChallengeMethod.S256,
        }),
      )
    },
  )
  app.get<{ Querystring: { state?: string; code?: string; error?: string } }>(
    '/api/auth/google/callback',
    { config: limited },
    async (req, reply) => {
      try {
        requireValue(
          googleEnabled &&
            req.query.state &&
            req.cookies['lcg-oauth'] &&
            equal(req.query.state, req.cookies['lcg-oauth']),
          'invalid_token',
        )
        const entry = await db.transaction(async (tx) => {
          const [row] = await tx.rows<{ nonce: string; verifier: string; user_id: string | null }>(
            'SELECT nonce, verifier, user_id FROM oauth_requests WHERE state_hash = ? AND expires_at > ? FOR UPDATE',
            [digest(req.query.state!), Date.now()],
          )
          requireValue(row, 'invalid_token')
          await tx.exec('DELETE FROM oauth_requests WHERE state_hash = ?', [
            digest(req.query.state!),
          ])
          return row
        })
        requireValue(req.query.code && !req.query.error, 'google_cancelled')
        const { tokens } = await google.getToken({
          code: req.query.code,
          codeVerifier: entry.verifier,
        })
        requireValue(tokens.id_token, 'invalid_token')
        const ticket = await google.verifyIdToken({
          idToken: tokens.id_token,
          audience: config.googleClientId!,
        })
        const claims = ticket.getPayload()
        requireValue(claims?.sub && claims.email && claims.nonce === entry.nonce, 'invalid_token')
        const address = email(claims.email)
        const authoritative =
          claims.email_verified && (address.endsWith('@gmail.com') || !!claims.hd)
        const user = await db.transaction(async (tx) => {
          const [identity] = await tx.rows<User>(
            'SELECT u.* FROM auth_identities i JOIN users u ON u.id = i.user_id WHERE i.subject = ?',
            [claims.sub],
          )
          if (entry.user_id) {
            const active = await requireUser(req)
            requireValue(
              active.id === entry.user_id && (!identity || identity.id === active.id),
              'google_link_required',
              409,
            )
            await tx.exec('INSERT IGNORE INTO auth_identities (subject, user_id) VALUES (?, ?)', [
              claims.sub,
              active.id,
            ])
            const [linked] = await tx.rows<{ user_id: string }>(
              'SELECT user_id FROM auth_identities WHERE subject = ?',
              [claims.sub],
            )
            requireValue(linked?.user_id === active.id, 'google_link_required', 409)
            return active
          }
          if (identity) return identity
          const [existing] = await tx.rows<User>('SELECT id FROM users WHERE email = ?', [address])
          requireValue(!existing, 'google_link_required', 409)
          const created: User = {
            id: randomUUID(),
            email: address,
            name: (claims.name ?? address).slice(0, 100),
            locale: 'es',
            verified: authoritative ? 1 : 0,
          }
          await tx.exec(
            'INSERT INTO users (id, email, name, verified, locale, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [created.id, created.email, created.name, created.verified, created.locale, Date.now()],
          )
          await tx.exec('INSERT INTO auth_identities (subject, user_id) VALUES (?, ?)', [
            claims.sub,
            created.id,
          ])
          return created
        })
        if (!user.verified) {
          await issue(user, 'verify')
          throw new ApiError('verification_required', 403)
        }
        await session(user, reply, 'login_google')
        reply.clearCookie('lcg-oauth', cookieOptions)
        return reply.redirect(`${config.origin}/account#google=ok`)
      } catch (error) {
        reply.clearCookie('lcg-oauth', cookieOptions)
        const code = error instanceof ApiError ? error.code : 'google_failed'
        return reply.redirect(`${config.origin}/account#google=${encodeURIComponent(code)}`)
      }
    },
  )
  app.delete<{ Body: { password?: string } }>(
    '/api/me',
    { config: limited },
    async (req, reply) => {
      const user = await requireUser(req)
      const [credential] = await db.rows<User>('SELECT password_hash FROM users WHERE id = ?', [
        user.id,
      ])
      requireValue(
        credential?.password_hash &&
          typeof req.body?.password === 'string' &&
          req.body.password.length <= 128 &&
          (await verifyPassword(credential.password_hash, req.body.password)),
        'reauthenticate',
        403,
      )
      await db.exec('DELETE FROM users WHERE id = ?', [user.id])
      reply.clearCookie(cookieName, cookieOptions)
      return { ok: true }
    },
  )
  return { requireUser, current }
}
