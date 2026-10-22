export const PLATFORM_ADMIN_EMAIL = 'malkivian@gmail.com'
export const canAdminister = (
  user: { email: string; role?: string; verified: boolean | number } | null,
) => !!user && !!user.verified && user.role === 'admin' && user.email === PLATFORM_ADMIN_EMAIL

export interface AdminOverview {
  users: number
  verified: number
  sessions: number
  documents: number
  failedMail: number
  smtp: boolean
  google: boolean
}
export interface AdminUser {
  id: string
  email: string
  name: string
  verified: number
  role: string
  created_at: number
  last_access: number | null
  sessions: number
  documents: number
}
export interface AdminActivity {
  id: string
  email: string
  kind: string
  status: string
  created_at: number
}
export interface AdminPage<T> {
  items: T[]
  more: boolean
}
