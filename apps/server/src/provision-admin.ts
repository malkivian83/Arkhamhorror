import { database } from './accounts/database'
import { provisionAdmin } from './accounts/admin'

const url = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is required')
if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)
  throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required')
const connection = database(url)
try {
  const result = await provisionAdmin(connection.db, {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    ...(process.env.ADMIN_NAME ? { name: process.env.ADMIN_NAME } : {}),
  })
  console.log(result.created ? 'Administrator provisioned' : 'Administrator already provisioned')
} finally {
  await connection.close()
}
