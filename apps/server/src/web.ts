import fastifyStatic from '@fastify/static'
import type { FastifyInstance } from 'fastify'
import { basename } from 'node:path'

const pages = new Set([
  '/',
  '/account',
  '/library',
  '/admin',
  '/game',
  '/campaign',
  '/decks',
  '/online',
])

/** Only public assets and known client-side pages are served. API misses stay JSON. */
export async function serveWeb(app: FastifyInstance, root: string) {
  await app.register(fastifyStatic, {
    root,
    index: false,
    dotfiles: 'deny',
    setHeaders(response, file) {
      if (basename(file) === 'index.html') response.header('Cache-Control', 'no-cache')
    },
  })
  for (const path of pages) app.get(path, (_request, reply) => reply.sendFile('index.html'))
  app.get(
    '/online/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
      },
    },
    (_request, reply) => reply.sendFile('index.html'),
  )
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ code: 'not_found' }))
}
