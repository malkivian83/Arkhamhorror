import { accountConfig } from './accounts/config'
import { database, migrate } from './accounts/database'
import { provisionAdmin } from './accounts/admin'

/** Runs after production dependencies are installed and before Passenger is restarted. */
const config = accountConfig()
if (!config) throw new Error('DATABASE_URL is required for deployment')
const connection = database(process.env.MIGRATION_DATABASE_URL || config.databaseUrl)
try {
  await migrate(connection.db)
  console.log('Database migrations applied')
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const result = await provisionAdmin(connection.db, {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      ...(process.env.ADMIN_NAME ? { name: process.env.ADMIN_NAME } : {}),
    })
    console.log(result.created ? 'Administrator provisioned' : 'Administrator already provisioned')
  } else {
    const [admin] = await connection.db.rows(
      "SELECT user_id FROM account_roles WHERE role = 'admin' LIMIT 1",
    )
    if (!admin)
      throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required for initial deployment')
    console.log('Existing administrator retained')
  }
} finally {
  await connection.close()
}
