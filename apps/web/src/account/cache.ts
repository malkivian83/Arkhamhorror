/** Durable outbox. Promise resolves only after the IndexedDB transaction commits. */
export class LibraryCache<T extends { key: string }> {
  private database: Promise<IDBDatabase> | undefined
  private open() {
    return (this.database ??= new Promise((resolve, reject) => {
      const request = indexedDB.open('lcg-account-library', 1)
      request.onupgradeneeded = () =>
        request.result.createObjectStore('documents', { keyPath: 'key' })
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    }))
  }
  async all(): Promise<T[]> {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('documents', 'readonly'),
        request = tx.objectStore('documents').getAll()
      tx.oncomplete = () => resolve(request.result as T[])
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  }
  async put(value: T) {
    const db = await this.open()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('documents', 'readwrite')
      tx.objectStore('documents').put(value)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  }
  async clearOwner(owner: string) {
    const db = await this.open()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('documents', 'readwrite'),
        request = tx.objectStore('documents').openCursor()
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          if (String(cursor.key).startsWith(`${owner}:`)) cursor.delete()
          cursor.continue()
        }
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }
}
