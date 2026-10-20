// Working state lives in memory. A guest's copy is mirrored to this tab's
// sessionStorage so reloading keeps the game; closing the tab discards it.
// Account games are reopened from the server instead (see library.ts).
let userId: string | null = null
const working = new Map<string, string>()
type DataKind = 'game' | 'decks' | 'rewards'
const listeners = new Set<(kind: DataKind, raw: string) => void>()
const GUEST_PREFIX = 'lcg:guest:'
/** Run against this tab's sessionStorage; it may be blocked or full. */
export function tabStorage<T>(action: (storage: Storage) => T): T | undefined {
  try {
    return action(sessionStorage)
  } catch {
    return undefined
  }
}
function guestKeys(storage: Storage) {
  const keys: string[] = []
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index)
    if (key?.startsWith(GUEST_PREFIX)) keys.push(key)
  }
  return keys
}
export const setStorageUser = (id: string | null) => {
  if (id !== userId) working.clear()
  userId = id
  if (id === null)
    tabStorage((storage) => {
      for (const key of guestKeys(storage))
        working.set(key.slice(GUEST_PREFIX.length), storage.getItem(key)!)
    })
}
export const accountStorage = {
  getItem: (key: string) => working.get(key) ?? null,
  setItem: (key: string, value: string) => {
    working.set(key, value)
    if (userId !== null) return
    tabStorage((storage) => {
      try {
        storage.setItem(GUEST_PREFIX + key, value)
      } catch {
        // Full: an older copy would reopen a stale game after reloading.
        storage.removeItem(GUEST_PREFIX + key)
      }
    })
  },
  removeItem: (key: string) => {
    working.delete(key)
    if (userId === null) tabStorage((storage) => storage.removeItem(GUEST_PREFIX + key))
  },
  clear: () => {
    working.clear()
    if (userId === null)
      tabStorage((storage) => guestKeys(storage).forEach((key) => storage.removeItem(key)))
  },
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
