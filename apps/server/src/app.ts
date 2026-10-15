import websocket from '@fastify/websocket'
import type { ClientMessage, HealthResponse, ServerMessage } from '@lcg/shared'
import Fastify from 'fastify'

export const SERVER_VERSION = '0.0.0'

export async function buildApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' })
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

  return app
}
