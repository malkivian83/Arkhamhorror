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

/** Card art, tokens and narration: a day fresh, then revalidated in the background. */
export const LOCAL_ASSETS_CACHE = 'public, max-age=86400, stale-while-revalidate=604800'

/** Only public assets and known client-side pages are served. API misses stay JSON. */
export async function serveWeb(app: FastifyInstance, root: string) {
  await app.register(fastifyStatic, {
    root,
    index: false,
    dotfiles: 'deny',
    setHeaders(response, file) {
      if (basename(file) === 'index.html') response.header('Cache-Control', 'no-cache')
      // Hashed Vite bundles never change; card art and audio rarely do (doc 100, O2).
      else if (/[\\/]assets[\\/]/.test(file))
        response.header('Cache-Control', 'public, max-age=31536000, immutable')
      else if (/[\\/]local-assets[\\/]/.test(file))
        response.header('Cache-Control', LOCAL_ASSETS_CACHE)
    },
  })
  for (const path of pages) app.get(path, (_request, reply) => reply.sendFile('index.html'))
  for (const path of ['/online/:id', '/online/:id/play'])
    app.get(
      path,
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
