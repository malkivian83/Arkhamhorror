import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { afterEach, expect, it, vi } from 'vitest'
import { authentication, type User } from './auth'
import { dashboard } from './dashboard'
import { ApiError, csrfFor } from './security'
import type { Database } from './database'

const origin = 'https://www.arkham-online.es'
const id = '12345678-1234-4234-8234-123456789abc'
const target: User = {
  id,
  email: 'pending@example.test',
  name: 'Pending',
  locale: 'es',
  verified: 0,
}
const apps: ReturnType<typeof Fastify>[] = []
afterEach(async () => {
  await Promise.all(apps.map((app) => app.close()))
  apps.length = 0
})

async function fixture(user: User | null = target) {
  const app = Fastify()
  apps.push(app)
  await app.register(cookie)
  const rows = vi.fn(async (sql: string) => {
    if (sql.includes('FROM auth_sessions s'))
      return [{ id: 'admin', email: 'malkivian@gmail.com', verified: 1, role: 'admin' }]
    return user ? [user] : []
  })
  const exec = vi.fn().mockResolvedValue({ affectedRows: 1 })
  const db = {
    rows,
    exec,
    transaction: vi.fn(async (run: (tx: Database) => Promise<unknown>) =>
      run(db as unknown as Database),
    ),
  }
  const sendMail = vi.fn().mockResolvedValue(undefined)
  const config = { origin, production: false, databaseUrl: 'unused' }
  app.setErrorHandler((error, _req, reply) => {
    const status =
      error instanceof ApiError
        ? error.statusCode
        : ((error as { statusCode?: number }).statusCode ?? 500)
    reply.code(status).send({ code: error instanceof ApiError ? error.code : 'invalid' })
  })
  const auth = authentication(app, db as unknown as Database, config, sendMail)
  dashboard(app, db as unknown as Database, auth, config)
  await app.ready()
  const post = (action: string, headers: Record<string, string> = {}) =>
    app.inject({
      method: 'POST',
      url: `/api/admin/users/${id}/${action}`,
      headers: {
        origin,
        cookie: 'lcg-session=session',
        'x-csrf-token': csrfFor('session'),
        ...headers,
      },
    })
  return { app, db, sendMail, post }
}

it('activates an account atomically and removes verification tokens without changing credentials or role', async () => {
  const { db, post } = await fixture()
  expect((await post('activate')).statusCode).toBe(200)
  expect(db.transaction).toHaveBeenCalledOnce()
  expect(db.rows).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ? FOR UPDATE', [id])
  const changes = db.exec.mock.calls.filter(([sql]) => !sql.includes('last_used_at'))
  expect(changes).toEqual([
    ['UPDATE users SET verified = TRUE WHERE id = ?', [id]],
    ["DELETE FROM account_tokens WHERE user_id = ? AND purpose = 'verify'", [id]],
  ])
})

it('resends the existing localized verification email and records SMTP acceptance', async () => {
  const { post, db, sendMail } = await fixture()
  const response = await post('resend-verification')
  expect(response.statusCode).toBe(200)
  expect(sendMail).toHaveBeenCalledWith(
    expect.objectContaining({
      to: target.email,
      text: expect.stringContaining(`${origin}/account#action=verify&token=`),
    }),
  )
  expect(db.exec).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO account_tokens'),
    expect.arrayContaining([id, 'verify']),
  )
  expect(db.exec).toHaveBeenCalledWith(
    "UPDATE account_activity SET status = 'success' WHERE id = ?",
    expect.any(Array),
  )
  expect(response.body).not.toContain('token')
})

it('reports SMTP failure and removes the token that could not be sent', async () => {
  const { post, db, sendMail } = await fixture()
  sendMail.mockRejectedValueOnce(new Error('private SMTP details'))
  const response = await post('resend-verification')
  expect(response.statusCode).toBe(503)
  expect(response.json()).toEqual({ code: 'mail_unavailable' })
  expect(db.exec).toHaveBeenCalledWith(
    "UPDATE account_activity SET status = 'failed' WHERE id = ?",
    expect.any(Array),
  )
  expect(db.exec).toHaveBeenCalledWith(
    'DELETE FROM account_tokens WHERE token_hash = ?',
    expect.any(Array),
  )
})

it.each(['activate', 'resend-verification'])(
  'protects %s against CSRF and foreign origins',
  async (action) => {
    const { post, db, sendMail } = await fixture()
    expect((await post(action, { origin: 'https://foreign.example' })).statusCode).toBe(403)
    expect((await post(action, { 'x-csrf-token': '' })).statusCode).toBe(403)
    expect(db.transaction).not.toHaveBeenCalled()
    expect(sendMail).not.toHaveBeenCalled()
  },
)

it.each(['activate', 'resend-verification'])('rejects missing users for %s', async (action) => {
  const { post, sendMail, db } = await fixture(null)
  expect((await post(action)).statusCode).toBe(404)
  expect(sendMail).not.toHaveBeenCalled()
  expect(db.exec.mock.calls.some(([sql]) => sql.includes('SET verified'))).toBe(false)
})

it('does not send verification to an already active account', async () => {
  const { post, sendMail } = await fixture({ ...target, verified: 1 })
  expect((await post('resend-verification')).statusCode).toBe(409)
  expect(sendMail).not.toHaveBeenCalled()
})
