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
    user: {
      id: 'user-a',
      email: 'a@example.com',
      name: 'A',
      locale: 'es',
      verified: true,
      role: 'user',
    },
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
  vi.stubGlobal('indexedDB', {
    open: vi.fn(() => {
      throw new Error('No local database allowed')
    }),
  })
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

describe('guardado online de la biblioteca', () => {
  it('solo guarda la partida en el servidor al pulsar Guardar', async () => {
    library.trackGame(JSON.stringify(game()))
    await vi.advanceTimersByTimeAsync(800)
    expect(remote.size).toBe(0)
    expect(library.unsavedGame.value).toBe(true)
    await library.saveGame(JSON.stringify(game()))
    expect(remote.size).toBe(1)
    expect(library.syncStatus.value).toBe('saved')
    expect(library.unsavedGame.value).toBe(false)
    expect(storage.data.size).toBe(0)
  })
  it('al recargar conserva en la pestaña una partida que nunca se guardó', async () => {
    const raw = JSON.stringify(game())
    library.trackGame(raw)
    vi.resetModules()
    await boot()
    expect(scoped.accountStorage.getItem('active-save')).toBeNull()
    expect(scoped.accountStorage.getItem('lcg:session:v1')).toBe(raw)
    expect(library.unsavedGame.value).toBe(true)
    expect(remote.size).toBe(0)
  })
  it('consulta la versión actual del servidor antes de abrir una aventura', async () => {
    const id = await library.saveDocument('campaign', 'Adventure', game())
    await library.flush()
    const updated = { ...game(), campaign: { ...game().campaign!, name: 'Updated' } }
    remote.get(id!)!.payload = updated
    remote.get(id!)!.revision++
    const load = vi.fn(() => true)
    expect(await library.activateCampaign(id!, load)).toBe(true)
    expect(load).toHaveBeenCalledWith(JSON.stringify(updated))
  })
  it('no permite escribir con una biblioteca que no ha podido cargar del servidor', async () => {
    await library.stopLibrary()
    vi.resetModules()
    disconnect = true
    await boot()
    await expect(library.saveDocument('campaign', 'Adventure', game())).rejects.toMatchObject({
      code: 'network',
    })
    expect(library.documents.value).toEqual([])
    expect(remote.size).toBe(0)
  })
  it.each(['{"revision":', '{}', 'null'])(
    'conserva la operación si la confirmación del servidor es inválida: %s',
    async (acknowledgement) => {
      const originalFetch = fetch
      let truncate = true
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string, options: RequestInit) => {
          const response = await originalFetch(url, options)
          if (options.method === 'PUT' && truncate) {
            truncate = false
            return new Response(acknowledgement)
          }
          return response
        }),
      )
      const id = await library.saveDocument('campaign', 'Adventure', game())
      await library.flush()
      expect(remote.get(id!)?.revision).toBe(1)
      expect(library.documents.value[0]!.operation).not.toBeNull()
      expect(library.documents.value[0]!.revision).toBe(0)
      await library.flush()
      expect(remote.get(id!)?.revision).toBe(1)
      expect(library.documents.value[0]!.operation).toBeNull()
    },
  )
  it('retira la partida activa si se ha borrado desde otro dispositivo antes de recargar', async () => {
    const raw = JSON.stringify(game())
    await library.saveGame(raw)
    scoped.accountStorage.setItem('lcg:session:v1', raw)
    const doc = remote.get(library.documents.value[0]!.id)!
    doc.deleted = true
    doc.revision++
    await library.stopLibrary()
    vi.resetModules()
    await boot()
    expect(scoped.accountStorage.getItem('active-save')).toBeNull()
    expect(scoped.accountStorage.getItem('lcg:session:v1')).toBeNull()
    expect(library.documents.value).toEqual([])
  })
  it('actualiza la copia de mazos y recompensas al refrescar cambios remotos', async () => {
    const deck = { id: 'deck-a', name: 'Remote deck', investigator: '12004', cards: ['12005'] }
    const id = await library.saveDocument('deck', deck.name, deck)
    await library.saveDocument('rewards', 'Rewards', ['12181'])
    await library.flush()
    const doc = remote.get(id!)!
    doc.payload = { ...deck, name: 'Updated remotely' }
    doc.revision++
    await library.refreshLibrary()
    expect(JSON.parse(scoped.accountStorage.getItem('lcg:decks')!)[0].name).toBe('Updated remotely')
    expect(JSON.parse(scoped.accountStorage.getItem('lcg:rewards')!)).toEqual(['12181'])
    doc.deleted = true
    doc.revision++
    await library.refreshLibrary()
    expect(JSON.parse(scoped.accountStorage.getItem('lcg:decks')!)).toEqual([])
  })
  it('no adelanta la revisión base de una partida abierta al refrescar una versión remota', async () => {
    await library.saveGame(JSON.stringify(game()))
    const documentId = library.documents.value[0]!.id
    remote.get(documentId)!.revision = 2
    remote.get(documentId)!.name = 'Changed on another device'
    await library.refreshLibrary()
    expect(library.documents.value[0]!.revision).toBe(1)
    expect(library.documents.value[0]!.conflict).toBe(true)
    expect(await library.resolveConflict(documentId, false)).toBe(true)
    expect(scoped.accountStorage.getItem('active-save')).toBeNull()
  })
  it('no lee ni escribe datos de juego del navegador y separa identidades', () => {
    storage.setItem('lcg:decks', 'old guest data')
    expect(scoped.accountStorage.getItem('lcg:decks')).not.toBe('old guest data')
    scoped.accountStorage.setItem('lcg:decks', 'private A')
    scoped.setStorageUser('user-b')
    expect(scoped.accountStorage.getItem('lcg:decks')).toBeNull()
    scoped.setStorageUser(null)
    expect(scoped.accountStorage.getItem('lcg:decks')).toBeNull()
    expect([...storage.data]).toEqual([['lcg:decks', 'old guest data']])
    expect(tabStorage.data.size).toBe(0)
  })
  it('guarda varias campañas con identificadores independientes', async () => {
    const first = await library.saveDocument('campaign', 'First', game())
    const second = await library.saveDocument('campaign', 'Second', game())
    await library.flush()
    expect(first).not.toBe(second)
    expect(remote.size).toBe(2)
    expect(library.syncStatus.value).toBe('saved')
  })
  it('repite en memoria el mismo identificador al perder la respuesta', async () => {
    const documentId = await library.saveDocument('campaign', 'Adventure', game())
    loseResponse = true
    await library.flush()
    expect(library.syncStatus.value).toBe('offline')
    const original = library.documents.value[0]!.operation!
    expect(remote.get(documentId!)?.revision).toBe(1)
    await library.flush()
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
  it('pierde cambios sin guardar al recargar y conserva solo lo que llegó al servidor', async () => {
    await library.saveDocument('campaign', 'Saved online', game())
    await library.flush()
    disconnect = true
    await library.saveDocument('campaign', 'Unsaved adventure', game())
    await library.flush()
    expect(library.syncStatus.value).toBe('offline')
    await library.stopLibrary()
    vi.resetModules()
    disconnect = false
    await boot()
    expect(library.documents.value.map((d) => d.name)).toEqual(['Saved online'])
    expect(storage.data.size).toBe(0)
    expect(tabStorage.data.size).toBe(0)
  })
  it('no recupera partidas sin conexión al recargar', async () => {
    await library.saveDocument('campaign', 'Unsaved', game())
    disconnect = true
    await library.flush()
    await library.stopLibrary()
    vi.resetModules()
    await boot()
    expect(library.documents.value).toEqual([])
    expect(library.syncStatus.value).toBe('offline')
  })
  it('al recargar reabre la aventura de la pestaña con los cambios sin guardar', async () => {
    const first = game()
    await library.saveGame(JSON.stringify(first))
    const id = library.documents.value[0]!.id
    const later = { ...first, campaign: { ...first.campaign!, name: 'Later' } }
    library.trackGame(JSON.stringify(later))
    expect(library.unsavedGame.value).toBe(true)
    vi.resetModules()
    vi.clearAllTimers()
    await boot()
    expect(scoped.accountStorage.getItem('active-save')).toBe(id)
    expect(JSON.parse(scoped.accountStorage.getItem('lcg:session:v1')!).campaign.name).toBe('Later')
    expect(library.unsavedGame.value).toBe(true)
    await library.flush()
    expect(remote.get(id)!.revision).toBe(1)
    await library.saveGame(JSON.stringify(later))
    expect((remote.get(id)!.payload as typeof later).campaign.name).toBe('Later')
    expect(remote.size).toBe(1)
    expect(storage.data.size).toBe(0)
  })
  it('al recargar prefiere la versión de otro dispositivo si el servidor ya avanzó', async () => {
    await library.saveGame(JSON.stringify(game()))
    const id = library.documents.value[0]!.id
    const remoteGame = { ...game(), campaign: { ...game().campaign!, name: 'Remote' } }
    remote.get(id)!.payload = remoteGame
    remote.get(id)!.revision++
    vi.resetModules()
    await boot()
    expect(JSON.parse(scoped.accountStorage.getItem('lcg:session:v1')!).campaign.name).toBe(
      'Remote',
    )
  })
  it('al cerrar sesión o empezar de nuevo la pestaña olvida la aventura', async () => {
    library.trackGame(JSON.stringify(game()))
    expect(tabStorage.data.size).toBe(1)
    library.newAdventure()
    expect(tabStorage.data.size).toBe(0)
    library.trackGame(JSON.stringify(game()))
    await library.stopLibrary()
    expect(tabStorage.data.size).toBe(0)
  })
  it('no crea varias aventuras al guardar seguido y asigna otra al empezar de nuevo', async () => {
    await Promise.all([
      library.saveGame(JSON.stringify(game())),
      library.saveGame(JSON.stringify(game())),
    ])
    await library.flush()
    expect(remote.size).toBe(1)
    library.newAdventure()
    await library.saveGame(JSON.stringify(game()))
    await library.flush()
    expect(remote.size).toBe(2)
  })
})
