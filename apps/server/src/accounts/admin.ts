import { randomUUID } from 'node:crypto'
import type { Database } from './database'
import { hashPassword } from './security'

export interface AdminCredentials {
  email: string
  password: string
  name?: string
}

/** Explicit provisioning only. Public registration can never grant this role. */
export async function provisionAdmin(db: Database, credentials: AdminCredentials) {
  const email = credentials.email.trim().toLowerCase()
  const name = (credentials.name ?? 'Administrador').trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    throw new Error('Invalid ADMIN_EMAIL')
  if (credentials.password.length < 12 || credentials.password.length > 128)
    throw new Error('ADMIN_PASSWORD must contain 12 to 128 characters')
  if (!name || name.length > 100) throw new Error('Invalid ADMIN_NAME')
  const passwordHash = await hashPassword(credentials.password)
  return db.transaction(async (tx) => {
    await tx.exec(
      'INSERT IGNORE INTO users (id, email, name, password_hash, verified, locale, created_at) VALUES (?, ?, ?, ?, TRUE, ?, ?)',
      [randomUUID(), email, name, passwordHash, 'es', Date.now()],
    )
    const [user] = await tx.rows<{ id: string }>(
      'SELECT id FROM users WHERE email = ? FOR UPDATE',
      [email],
    )
    if (!user) throw new Error('Could not provision administrator')
    const [role] = await tx.rows('SELECT role FROM account_roles WHERE user_id = ?', [user.id])
    // Repeated deployments must not undo a password change made by the administrator.
    if (role) return { id: user.id, created: false }
    await tx.exec('UPDATE users SET password_hash = ?, verified = TRUE WHERE id = ?', [
      passwordHash,
      user.id,
    ])
    await tx.exec('DELETE FROM auth_sessions WHERE user_id = ?', [user.id])
    await tx.exec('DELETE FROM account_tokens WHERE user_id = ?', [user.id])
    await tx.exec("INSERT INTO account_roles (user_id, role) VALUES (?, 'admin')", [user.id])
    return { id: user.id, created: true }
  })
}
