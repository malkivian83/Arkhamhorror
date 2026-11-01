import { afterEach, expect, it } from 'vitest'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { FastifyInstance } from 'fastify'
import { buildApp } from './app'

let directory: string, app: FastifyInstance
afterEach(async () => {
  await app?.close()
  if (directory) await rm(directory, { recursive: true, force: true })
})
it('sirve las rutas de Vue y los recursos públicos sin exponer archivos privados ni ocultar errores API', async () => {
  directory = await mkdtemp(join(tmpdir(), 'arkham-web-'))
  const webRoot = join(directory, 'public')
  await mkdir(webRoot)
  await writeFile(join(directory, '.env'), 'PRIVATE_SECRET=not-public')
  await writeFile(join(webRoot, 'index.html'), '<html>Arkham test</html>')
  await writeFile(join(webRoot, 'style.css'), 'body {color: red}')
  await mkdir(join(webRoot, 'assets'))
  await writeFile(join(webRoot, 'assets', 'index-abc123.js'), 'console.log(1)')
  await mkdir(join(webRoot, 'local-assets', 'cards'), { recursive: true })
  await writeFile(join(webRoot, 'local-assets', 'cards', '01001.avif'), 'img')
  app = await buildApp({ webRoot })
  for (const path of [
    '/',
    '/account',
    '/library',
    '/admin',
    '/game',
    '/campaign',
    '/decks',
    '/online',
    '/online/12345678-1234-4234-8234-123456789abc',
    '/online/12345678-1234-4234-8234-123456789abc/play',
  ]) {
    const response = await app.inject(path)
    expect(response.statusCode, `${path}: ${response.body}`).toBe(200)
    expect(response.body).toContain('Arkham test')
    expect(response.headers['cache-control']).toBe('no-cache')
  }
  expect((await app.inject('/style.css')).headers['content-type']).toContain('text/css')
  // Hashed bundles are immutable; card art is fresh for a day, then revalidated (O2).
  expect((await app.inject('/assets/index-abc123.js')).headers['cache-control']).toBe(
    'public, max-age=31536000, immutable',
  )
  expect((await app.inject('/local-assets/cards/01001.avif')).headers['cache-control']).toBe(
    'public, max-age=86400, stale-while-revalidate=604800',
  )
  expect((await app.inject('/api/health')).json()).toMatchObject({ status: 'ok' })
  for (const path of [
    '/api/missing',
    '/.env',
    '/apps/server/package.json',
    '/%2eenv',
    '/missing.js',
    '/online/12345678-1234-4234-8234-123456789abc/missing',
  ]) {
    const response = await app.inject({ url: path, headers: { accept: 'text/html' } })
    expect([403, 404]).toContain(response.statusCode)
    expect(response.body).not.toContain('Arkham test')
    expect(response.body).not.toContain('PRIVATE_SECRET')
  }
})
