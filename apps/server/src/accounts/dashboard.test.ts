import Fastify from 'fastify'
import { describe, expect, it, vi } from 'vitest'
import { dashboard } from './dashboard'
import type { Database } from './database'
import type { authentication, User } from './auth'
import { ApiError } from './security'

const owner: User = {
  id: 'owner',
  email: 'malkivian@gmail.com',
  name: 'Admin',
  locale: 'es',
  verified: 1,
  role: 'admin',
}
async function fixture(user: User | null = owner) {
  const app = Fastify()
  const rows = vi.fn().mockResolvedValue([])
  app.setErrorHandler((error, _req, reply) => {
    const status =
      error instanceof ApiError
        ? error.statusCode
        : ((error as { statusCode?: number }).statusCode ?? 500)
    reply.code(status).send({})
  })
  dashboard(
    app,
    { rows } as unknown as Database,
    {
      current: async () => user,
      requireUser: async () => {
        if (!user) throw new ApiError('unauthorized', 401)
        return user
      },
    } as ReturnType<typeof authentication>,
    {
      databaseUrl: 'unused',
      origin: 'http://localhost',
      production: false,
      smtpUrl: 'smtp://secret',
      mailFrom: 'test@example.com',
    },
  )
  await app.ready()
  return { app, rows }
}
describe('administration authorization and bounded reads', () => {
  it.each([
    [null, 401],
    [{ ...owner, role: 'user' }, 403],
    [{ ...owner, verified: 0 }, 403],
    [{ ...owner, email: 'other@example.com' }, 403],
  ] as const)('denies unauthorized accounts on every endpoint', async (user, status) => {
    const { app, rows } = await fixture(user)
    try {
      for (const path of ['overview', 'users', 'access', 'mail'])
        expect((await app.inject(`/api/admin/${path}`)).statusCode).toBe(status)
      expect(rows).not.toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })
  it('paginates and binds search text without exposing configuration secrets', async () => {
    const { app, rows } = await fixture()
    try {
      rows.mockResolvedValueOnce(Array.from({ length: 51 }, (_, id) => ({ id })))
      const response = await app.inject('/api/admin/users?page=1&search=%27%20OR%201%3D1')
      expect(response.statusCode).toBe(200)
      expect(response.json().items).toHaveLength(50)
      expect(response.json().more).toBe(true)
      expect(rows.mock.calls[0]?.[0]).toContain('LIMIT 51 OFFSET 50')
      expect(rows.mock.calls[0]?.[1].slice(-2)).toEqual(["' OR 1=1", "' OR 1=1"])
      rows.mockResolvedValueOnce([
        { users: 2, verified: 1, sessions: 1, documents: 3, failedMail: 0 },
      ])
      const overview = await app.inject('/api/admin/overview')
      expect(overview.json()).toEqual({
        users: 2,
        verified: 1,
        sessions: 1,
        documents: 3,
        failedMail: 0,
        smtp: true,
        google: false,
      })
      expect(overview.body).not.toContain('secret')
    } finally {
      await app.close()
    }
  })
  it('rejects invalid pagination and bounds empty activity pages', async () => {
    const { app, rows } = await fixture()
    try {
      for (const page of ['-1', '1.5', '100001', '0 OR 1=1'])
        expect(
          (await app.inject(`/api/admin/mail?page=${encodeURIComponent(page)}`)).statusCode,
        ).toBe(400)
      expect(rows).not.toHaveBeenCalled()
      for (const path of ['access', 'mail']) {
        const response = await app.inject(`/api/admin/${path}`)
        expect(response.statusCode).toBe(200)
        expect(response.json()).toEqual({ items: [], more: false })
      }
    } finally {
      await app.close()
    }
  })
})
