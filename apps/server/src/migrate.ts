import { accountConfig } from './accounts/config'
import { database, migrate } from './accounts/database'
const config = accountConfig()
if (!config) throw new Error('DATABASE_URL is required')
const { db, close } = database(process.env.MIGRATION_DATABASE_URL ?? config.databaseUrl)
try {
  await migrate(db)
  console.log('MySQL migrations applied')
} finally {
  await close()
}
