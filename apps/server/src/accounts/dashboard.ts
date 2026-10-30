import type { FastifyInstance } from 'fastify'
import { canAdminister, type AdminOverview, type AdminUser, type AdminActivity } from '@lcg/shared'
import type { Database } from './database'
import type { authentication, User } from './auth'
import type { AccountConfig } from './config'
import { requireValue } from './security'

const DAY = 86400000
export function dashboard(
  app: FastifyInstance,
  db: Database,
  auth: ReturnType<typeof authentication>,
  config: AccountConfig,
) {
  app.register(async (admin) => {
    admin.addHook('preHandler', async (req) => {
      requireValue(canAdminister(await auth.requireUser(req)), 'forbidden', 403)
    })
    for (const action of ['activate', 'resend-verification'] as const) {
      admin.post<{ Params: { id: string } }>(
        `/api/admin/users/:id/${action}`,
        {
          config: { rateLimit: { max: 10, timeWindow: '10 minutes' } },
          schema: {
            params: {
              type: 'object',
              required: ['id'],
              properties: { id: { type: 'string', format: 'uuid' } },
            },
          },
        },
        async (req) => {
          if (action === 'activate') {
            await db.transaction(async (tx) => {
              const [user] = await tx.rows<User>('SELECT * FROM users WHERE id = ? FOR UPDATE', [
                req.params.id,
              ])
              requireValue(user, 'not_found', 404)
              await tx.exec('UPDATE users SET verified = TRUE WHERE id = ?', [user.id])
              await tx.exec("DELETE FROM account_tokens WHERE user_id = ? AND purpose = 'verify'", [
                user.id,
              ])
            })
          } else {
            const [user] = await db.rows<User>('SELECT * FROM users WHERE id = ?', [req.params.id])
            requireValue(user, 'not_found', 404)
            requireValue(!user.verified, 'already_verified', 409)
            await auth.sendVerification(user)
          }
          return { ok: true }
        },
      )
    }
    admin.get('/api/admin/overview', async (): Promise<AdminOverview> => {
      const [counts] = await db.rows<Omit<AdminOverview, 'smtp' | 'google'>>(
        `SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM users WHERE verified = TRUE) AS verified,
        (SELECT COUNT(*) FROM auth_sessions WHERE expires_at > ? AND last_used_at > ?) AS sessions,
        (SELECT COUNT(*) FROM documents WHERE deleted = FALSE) AS documents,
        (SELECT COUNT(*) FROM account_activity WHERE kind IN ('mail_verify', 'mail_reset') AND status = 'failed' AND created_at > ?) AS failedMail`,
        [Date.now(), Date.now() - 7 * DAY, Date.now() - DAY],
      )
      return {
        ...counts!,
        smtp: !!(config.smtpUrl && config.mailFrom),
        google: !!(config.googleClientId && config.googleClientSecret),
      }
    })
    const querystring = {
      type: 'object',
      additionalProperties: false,
      properties: {
        page: { type: 'integer', minimum: 0, maximum: 100000, default: 0 },
        search: { type: 'string', maxLength: 100, default: '' },
      },
    }
    admin.get<{ Querystring: { page: number; search: string } }>(
      '/api/admin/users',
      { schema: { querystring } },
      async (req) => {
        const items = await db.rows<AdminUser>(
          `SELECT u.id, u.email, u.name, u.verified, u.created_at, COALESCE(r.role, 'user') AS role,
        (SELECT MAX(a.created_at) FROM account_activity a WHERE a.user_id = u.id AND a.kind IN ('login_password', 'login_google') AND a.status = 'success') AS last_access,
        (SELECT COUNT(*) FROM auth_sessions s WHERE s.user_id = u.id AND s.expires_at > ? AND s.last_used_at > ?) AS sessions,
        (SELECT COUNT(*) FROM documents d WHERE d.owner_id = u.id AND d.deleted = FALSE) AS documents
        FROM users u LEFT JOIN account_roles r ON r.user_id = u.id
        WHERE LOCATE(?, u.email) > 0 OR LOCATE(?, u.name) > 0
        ORDER BY u.created_at DESC, u.id DESC LIMIT 51 OFFSET ${req.query.page * 50}`,
          [Date.now(), Date.now() - 7 * DAY, req.query.search, req.query.search],
        )
        return { items: items.slice(0, 50), more: items.length > 50 }
      },
    )
    for (const section of ['access', 'mail'] as const) {
      admin.get<{ Querystring: { page: number; search: string } }>(
        `/api/admin/${section}`,
        { schema: { querystring } },
        async (req) => {
          const kinds =
            section === 'access'
              ? "'login_password', 'login_google'"
              : "'mail_verify', 'mail_reset'"
          const items = await db.rows<AdminActivity>(
            `SELECT a.id, u.email, a.kind, a.status, a.created_at
          FROM account_activity a JOIN users u ON u.id = a.user_id
          WHERE a.kind IN (${kinds}) AND LOCATE(?, u.email) > 0
          ORDER BY a.created_at DESC, a.id DESC LIMIT 51 OFFSET ${req.query.page * 50}`,
            [req.query.search],
          )
          return { items: items.slice(0, 50), more: items.length > 50 }
        },
      )
    }
  })
}
