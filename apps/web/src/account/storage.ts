let userId: string | null = null
let clientId: string | undefined
export function storageClient() {
  if (!clientId) {
    clientId = sessionStorage.getItem('lcg:client') ?? crypto.randomUUID()
    sessionStorage.setItem('lcg:client', clientId)
  }
  return clientId
}
type DataKind = 'game' | 'decks' | 'rewards'
const listeners = new Set<(kind: DataKind, raw: string) => void>()
export const setStorageUser = (id: string | null) => {
  userId = id
}
const keyFor = (key: string) => (userId ? `lcg:user:${userId}:${storageClient()}:${key}` : key)
/** Account-scoped synchronous working copy. Guest keys are never adopted on login. */
export const accountStorage = {
  getItem: (key: string) => localStorage.getItem(keyFor(key)),
  setItem: (key: string, value: string) => localStorage.setItem(keyFor(key), value),
  removeItem: (key: string) => localStorage.removeItem(keyFor(key)),
}
export function onLocalChange(listener: (kind: DataKind, raw: string) => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export function notifyLocalChange(kind: DataKind, raw: string) {
  listeners.forEach((listener) => listener(kind, raw))
}
