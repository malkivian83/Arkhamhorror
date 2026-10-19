import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CloudDocument, DocumentWrite } from '@lcg/shared'
import { newCampaign } from '@lcg/cards'
import { session } from '@lcg/saves'

class MemoryStorage {
  data = new Map<string, string>()
  getItem(key: string) {
    return this.data.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.data.set(key, String(value))
  }
  removeItem(key: string) {
    this.data.delete(key)
  }
}
let storage: MemoryStorage, tabStorage: MemoryStorage
let library: typeof import('./library'),
  apiModule: typeof import('./api'),
  scoped: typeof import('./storage')
let remote: Map<string, CloudDocument>, operations: Map<string, number>, writes: DocumentWrite[]
let disconnect = false,
  loseResponse = false
const game = () => session(null, null, newCampaign('brethren-of-ash', ['joe'], 'standard'))
const reply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

async function boot() {
  apiModule = await import('./api')
  scoped = await import('./storage')
  library = await import('./library')
  apiModule.account.value = {
    user: { id: 'user-a', email: 'a@example.com', name: 'A', locale: 'es', verified: true },
    csrf: 'csrf',
    enabled: true,
    google: true,
  }
  scoped.setStorageUser('user-a')
  await library.initializeLibrary()
  await library.flush()
}
beforeEach(async () => {
  vi.resetModules()
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  storage = new MemoryStorage()
  tabStorage = new MemoryStorage()
  remote = new Map()
  operations = new Map()
  writes = []
  disconnect = false
  loseResponse = false
  vi.stubGlobal('localStorage', storage)
  vi.stubGlobal('sessionStorage', tabStorage)
  vi.stubGlobal('indexedDB', new IDBFactory())
  vi.stubGlobal('window', new EventTarget())
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, options: RequestInit) => {
      if (disconnect) throw new TypeError('offline')
      if (url === '/api/library')
        return reply({ documents: [...remote.values()].map(({ payload: _p, ...meta }) => meta) })
      const documentId = url.split('/').at(-1)!
      if (options.method === 'PUT') {
        const body = JSON.parse(String(options.body)) as DocumentWrite
        writes.push(body)
        const operation = operations.get(body.operationId)
        if (operation) return reply({ revision: operation })
        if ((remote.get(documentId)?.revision ?? 0) !== body.revision)
          return reply({ code: 'conflict' }, 409)
        const revision = body.revision + 1
        remote.set(documentId, {
          id: documentId,
          kind: body.kind,
          name: body.name,
          payload: body.payload,
          revision,
          updatedAt: Date.now(),
          archived: body.archived,
          deleted: body.deleted,
        })
        operations.set(body.operationId, revision)
        if (loseResponse) {
          loseResponse = false
          throw new TypeError('connection lost after commit')
        }
        return reply({ revision })
      }
      return remote.has(documentId)
        ? reply(remote.get(documentId))
        : reply({ code: 'not_found' }, 404)
    }),
  )
  await boot()
})
afterEach(async () => {
  await library.stopLibrary()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('cola duradera de la biblioteca', () => {
  it('no adelanta la revisión base de una partida abierta al refrescar una versión remota', async () => {
    await library.trackGame(JSON.stringify(game()))
    await library.flush()
    const documentId = library.documents.value[0]!.id
    remote.get(documentId)!.revision = 2
    remote.get(documentId)!.name = 'Changed on another device'
    await library.refreshLibrary()
    expect(library.documents.value[0]!.revision).toBe(1)
    expect(library.documents.value[0]!.conflict).toBe(true)
    expect(await library.resolveConflict(documentId, false)).toBe(true)
    expect(scoped.accountStorage.getItem('active-save')).toBeNull()
  })
  it('separa invitado, cuentas y pestañas sin adoptar los datos de otra identidad', () => {
    storage.setItem('lcg:decks', 'guest')
    scoped.accountStorage.setItem('lcg:decks', 'private A')
    scoped.setStorageUser('user-b')
    expect(scoped.accountStorage.getItem('lcg:decks')).toBeNull()
    scoped.setStorageUser(null)
    expect(scoped.accountStorage.getItem('lcg:decks')).toBe('guest')
    scoped.setStorageUser('user-a')
    expect(scoped.accountStorage.getItem('lcg:decks')).toBe('private A')
  })
  it('guarda varias campañas con identificadores independientes', async () => {
    const first = await library.saveDocument('campaign', 'First', game())
    const second = await library.saveDocument('campaign', 'Second', game())
    await library.flush()
    expect(first).not.toBe(second)
    expect(remote.size).toBe(2)
    expect(library.syncStatus.value).toBe('saved')
  })
  it('persiste la operación antes de enviar y repite el mismo identificador al perder la respuesta', async () => {
    const documentId = await library.saveDocument('campaign', 'Adventure', game())
    loseResponse = true
    await library.flush()
    expect(library.syncStatus.value).toBe('offline')
    const original = library.documents.value[0]!.operation!
    expect(remote.get(documentId!)?.revision).toBe(1)
    await library.stopLibrary()
    vi.resetModules()
    await boot()
    expect(writes.at(-1)!.operationId).toBe(original.operationId)
    expect(remote.get(documentId!)?.revision).toBe(1)
    expect(library.documents.value[0]!.operation).toBeNull()
  })
  it('mantiene cambios hechos durante una escritura para la siguiente revisión', async () => {
    const originalFetch = fetch
    let release: () => void = () => {}
    const wait = new Promise<void>((resolve) => {
      release = resolve
    })
    let first = true
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, options: RequestInit) => {
        if (options.method === 'PUT' && first) {
          first = false
          await wait
        }
        return originalFetch(url, options)
      }),
    )
    const documentId = await library.saveDocument('campaign', 'Before', game())
    const saving = library.flush()
    await vi.waitFor(() =>
      expect(library.documents.value[0]?.operation ?? writes.length).toBeDefined(),
    )
    await library.saveDocument('campaign', 'After', game(), documentId)
    release()
    await saving
    await library.flush()
    expect(remote.get(documentId!)?.name).toBe('After')
    expect(library.documents.value[0]!.dirty).toBe(false)
  })
  it('detecta una revisión remota y permite conservar ambas versiones sin fusionar historias', async () => {
    const documentId = await library.saveDocument('campaign', 'Initial', game())
    await library.flush()
    remote.get(documentId!)!.revision = 2
    remote.get(documentId!)!.name = 'Remote'
    await library.saveDocument('campaign', 'Local', game(), documentId)
    await library.flush()
    expect(library.syncStatus.value).toBe('conflict')
    expect(library.documents.value[0]!.name).toBe('Local')
    await library.resolveConflict(documentId!, true)
    await library.flush()
    expect(remote.size).toBe(2)
    expect([...remote.values()].map((d) => d.name)).toContain('Remote')
    expect([...remote.values()].map((d) => d.name)).toContain('Local (copy)')
  })
  it('recupera cambios pendientes al reiniciar sin conexión y no los mezcla con los del servidor', async () => {
    await library.saveDocument('campaign', 'Offline adventure', game())
    disconnect = true
    await library.flush()
    await library.stopLibrary()
    vi.resetModules()
    await boot()
    expect(library.documents.value[0]!.name).toBe('Offline adventure')
    expect(library.documents.value[0]!.operation).not.toBeNull()
    disconnect = false
    await library.flush()
    expect(remote.size).toBe(1)
  })
  it('importa invitado con confirmación externa y correspondencia estable sin borrar originales', async () => {
    const raw = JSON.stringify(game())
    storage.setItem('lcg:session:v1', raw)
    storage.setItem(
      'lcg:decks',
      JSON.stringify([
        { id: 'guest-deck', name: 'Guest deck', investigator: '12004', cards: ['12005'] },
      ]),
    )
    storage.setItem('lcg:rewards', JSON.stringify(['12181']))
    await library.importGuest()
    await library.flush()
    const count = remote.size
    await library.importGuest()
    await library.flush()
    expect(remote.size).toBe(count)
    expect(count).toBe(3)
    expect(storage.getItem('lcg:session:v1')).toBe(raw)
    expect([...remote.values()].find((d) => d.kind === 'rewards')?.payload).toEqual(['12181'])
  })
  it('no crea varias aventuras si llegan acciones seguidas y asigna otra al empezar de nuevo', async () => {
    await Promise.all([
      library.trackGame(JSON.stringify(game())),
      library.trackGame(JSON.stringify(game())),
    ])
    await library.flush()
    expect(remote.size).toBe(1)
    library.newAdventure()
    await library.trackGame(JSON.stringify(game()))
    await library.flush()
    expect(remote.size).toBe(2)
  })
})
