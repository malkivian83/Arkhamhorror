export interface AccountUser {
  id: string
  email: string
  name: string
  locale: string
  verified: boolean
  role: 'user' | 'admin'
}
export interface AuthStatus {
  user: AccountUser | null
  csrf: string | null
  enabled: boolean
  google: boolean
}
export type DocumentKind = 'deck' | 'campaign' | 'rewards'
export interface CloudMetadata {
  id: string
  kind: DocumentKind
  name: string
  revision: number
  updatedAt: number
  archived: boolean
  deleted: boolean
}
export interface CloudDocument extends CloudMetadata {
  payload: unknown
}
export interface DocumentWrite {
  kind: DocumentKind
  name: string
  revision: number
  operationId: string
  payload: unknown
  archived: boolean
  deleted: boolean
}
