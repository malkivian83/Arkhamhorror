import { randomUUID } from 'node:crypto'
import type { Database } from './database'

export async function recordActivity(
  db: Database,
  userId: string,
  kind: 'login_password' | 'login_google' | 'mail_verify' | 'mail_reset',
  status: 'success' | 'failed' | 'pending',
) {
  const id = randomUUID()
  await db.exec(
    'INSERT INTO account_activity (id, user_id, kind, status, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, userId, kind, status, Date.now()],
  )
  return id
}
