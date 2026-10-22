import websocket from '@fastify/websocket'
import type { ClientMessage, HealthResponse, ServerMessage } from '@lcg/shared'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import { accountConfig, type AccountConfig } from './accounts/config'
import { database, type Database } from './accounts/database'
import { authentication } from './accounts/auth'
import { library } from './accounts/library'
import { mailer, type SendMail } from './accounts/mail'
import { ApiError } from './accounts/security'
import { serveWeb } from './web'
import { dashboard } from './accounts/dashboard'

export const SERVER_VERSION = '0.0.0'

export async function buildApp(
  options: { config?: AccountConfig; db?: Database; sendMail?: SendMail; webRoot?: string } = {},
) {
  const app = Fastify({
    trustProxy: ['127.0.0.1', '::1'],
    logger:
      process.env.NODE_ENV === 'test'
        ? false
        : {
            redact: [
              'req.headers.cookie',
              'req.headers.authorization',
              'req.headers["x-csrf-token"]',
            ],
            serializers: {
              req: (request: { method: string; url: string }) => ({
                method: request.method,
                url: request.url.split('?')[0]!,
              }),
            },
          },
  })
  await app.register(cookie)
  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    allowList: (request) => !request.url.startsWith('/api/'),
  })
  app.setErrorHandler((error, req, reply) => {
    if (error instanceof ApiError) return reply.code(error.statusCode).send({ code: error.code })
    const status =
      error &&
      typeof error === 'object' &&
      'statusCode' in error &&
      typeof error.statusCode === 'number'
        ? error.statusCode
        : 500
    if (status >= 500)
      req.log.error(
        { code: 'internal', errorName: error instanceof Error ? error.name : 'Unknown' },
        'API error',
      )
    return reply.code(status).send({
      code:
        status === 429
          ? 'rate_limit'
          : status === 413
            ? 'too_large'
            : status >= 500
              ? 'internal'
              : 'invalid',
    })
  })
  const config = options.config ?? accountConfig()
  if (config) {
    const connection = options.db ? null : database(config.databaseUrl)
    const db = options.db ?? connection!.db
    if (connection) app.addHook('onClose', () => connection.close())
    const auth = authentication(app, db, config, options.sendMail ?? mailer(config))
    library(app, db, auth)
    dashboard(app, db, auth, config)
    app.get('/api/ready', async () => {
      await db.rows('SELECT 1')
      return { status: 'ok' }
    })
  } else
    app.get('/api/auth/me', async () => ({ user: null, csrf: null, enabled: false, google: false }))
  await app.register(websocket)

  app.get('/api/health', async (): Promise<HealthResponse> => ({
    status: 'ok',
    version: SERVER_VERSION,
  }))

  app.get('/api/ws', { websocket: true }, (socket) => {
    const send = (msg: ServerMessage) => socket.send(JSON.stringify(msg))
    send({ type: 'hello', serverVersion: SERVER_VERSION })

    socket.on('message', (raw) => {
      let msg: ClientMessage
      try {
        msg = JSON.parse(raw.toString()) as ClientMessage
      } catch {
        send({ type: 'error', code: 'invalid_json' })
        return
      }
      // Las partidas se implementan en la fase 2 de la hoja de ruta.
      send({ type: 'error', code: `not_implemented:${msg.type}` })
    })
  })

  if (options.webRoot) await serveWeb(app, options.webRoot)
  return app
}
