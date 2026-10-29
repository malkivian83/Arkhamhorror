import { randomUUID } from 'node:crypto'
import { database } from './database'

/** Each SQL test suite owns its schema, including cascades and cleanup queries. */
export async function isolatedMysqlDatabase(url: string) {
  const isolatedUrl = new URL(url)
  if (!/^\/[a-zA-Z0-9_]+_test$/.test(isolatedUrl.pathname))
    throw new Error('MYSQL_TEST_URL must target an isolated database ending in _test')
  // Never derive a DROP target from the supplied database name.
  const schema = `lcg_${randomUUID().replaceAll('-', '')}_test`
  const admin = database(url)
  try {
    await admin.db.exec(`CREATE DATABASE \`${schema}\` CHARACTER SET utf8mb4`)
  } catch (error) {
    await admin.close()
    throw error
  }
  isolatedUrl.pathname = '/' + schema
  const isolated = database(isolatedUrl.href)
  return {
    db: isolated.db,
    async close() {
      try {
        await isolated.close()
      } finally {
        try {
          await admin.db.exec(`DROP DATABASE \`${schema}\``)
        } finally {
          await admin.close()
        }
      }
    },
  }
}
