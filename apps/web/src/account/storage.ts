// Working state exists only for the lifetime of this page, including guest games.
let userId: string | null = null
const working = new Map<string, string>()
type DataKind = 'game' | 'decks' | 'rewards'
const listeners = new Set<(kind: DataKind, raw: string) => void>()
export const setStorageUser = (id: string | null) => {
  if (id !== userId) working.clear()
  userId = id
}
export const accountStorage = {
  getItem: (key: string) => working.get(key) ?? null,
  setItem: (key: string, value: string) => {
    working.set(key, value)
  },
  removeItem: (key: string) => {
    working.delete(key)
  },
  clear: () => working.clear(),
}
export function onLocalChange(listener: (kind: DataKind, raw: string) => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export function notifyLocalChange(kind: DataKind, raw: string) {
  listeners.forEach((listener) => listener(kind, raw))
}

/** Remove saves from releases that persisted game data in the browser. */
export function discardLegacySaves() {
  try {
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const key = localStorage.key(index)
      if (
        key &&
        (key.startsWith('lcg:user:') ||
          key.startsWith('lcg:session:') ||
          ['lcg:decks', 'lcg:rewards', 'lcg:last-account'].includes(key))
      ) {
        localStorage.removeItem(key)
      }
    }
    sessionStorage.removeItem('lcg:client')
  } catch {
    // Browser storage may be disabled; online saves do not depend on it.
  }
  try {
    indexedDB.deleteDatabase('lcg-account-library')
  } catch {
    // IndexedDB may also be unavailable.
  }
}
