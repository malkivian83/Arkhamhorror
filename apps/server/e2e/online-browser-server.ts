/** Isolated server for the two-browser acceptance test. Never imported by production. */
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { buildApp } from '../src/app'
import { database, migrate } from '../src/accounts/database'
import { hashPassword } from '../src/accounts/security'

const url = new URL(process.env.MYSQL_TEST_URL ?? 'mysql://localhost/invalid')
if (!['localhost', '127.0.0.1'].includes(url.hostname) || !url.pathname.endsWith('_test'))
  throw new Error('A local isolated MYSQL_TEST_URL ending in _test is required')
const connection = database(url.href)
await migrate(connection.db)
for (const player of ['host', 'friend']) {
  await connection.db.exec(
    'INSERT IGNORE INTO users (id, email, name, password_hash, verified, locale, created_at) VALUES (?, ?, ?, ?, TRUE, ?, ?)',
    [
      randomUUID(),
      `browser-${player}@example.test`,
      player,
      await hashPassword('Online-browser-test-2026!'),
      'es',
      Date.now(),
    ],
  )
}
const port = 3187
const app = await buildApp({
  db: connection.db,
  config: { databaseUrl: url.href, origin: `http://127.0.0.1:${port}`, production: false },
  webRoot: fileURLToPath(new URL('../../web/dist/', import.meta.url)),
})
await app.listen({ host: '127.0.0.1', port })
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    void app.close().then(() => connection.close())
  })
console.log(`Browser fixture ready: http://127.0.0.1:${port}`)
