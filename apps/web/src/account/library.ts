import { shallowRef } from 'vue'
import type { CloudDocument, CloudMetadata, DocumentKind, DocumentWrite } from '@lcg/shared'
import { canonical, decodeSession, SESSION_KEY } from '@lcg/saves'
import type { DeckList } from '@lcg/cards'
import { account, api, ApiError, recoverAccountSession } from './api'
import { LibraryCache } from './cache'
import { accountStorage, onLocalChange, storageClient } from './storage'

export interface CachedDocument extends CloudDocument {
  key: string
  owner: string
  client: string
  dirty: boolean
  operation: DocumentWrite | null
  conflict: boolean
}
export const documents = shallowRef<CachedDocument[]>([])
export const recoveries = shallowRef<CachedDocument[]>([])
export const syncStatus = shallowRef('local')
export const syncError = shallowRef('')
const cache = new LibraryCache<CachedDocument>()
const records = new Map<string, CachedDocument>()
let running = false,
  stopped = false
let flushing: Promise<void> | undefined
let timer: ReturnType<typeof setTimeout> | undefined
let durable = Promise.resolve()
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const refresh = () => {
  documents.value = [...records.values()].map(clone)
}
function persist(record: CachedDocument) {
  const snapshot = clone(record)
  const write = durable.then(() => cache.put(snapshot))
  durable = write.catch(() => {
    syncStatus.value = 'error'
    syncError.value = 'storage'
  })
  return write
}
function schedule() {
  if (stopped) return
  clearTimeout(timer)
  timer = setTimeout(() => {
    void flush()
  }, 800)
}
function pending() {
  return [...records.values()].some((d) => d.dirty || d.operation)
}

/** One outbox operation stays immutable until acknowledged; edits made in flight form the next one. */
export function flush(): Promise<void> {
  return (flushing ??= runFlush().finally(() => {
    flushing = undefined
  }))
}
async function runFlush() {
  if (running || stopped || !account.value.user) return
  running = true
  try {
    await recoverAccountSession()
    for (const record of records.values()) {
      if (record.conflict || (!record.dirty && !record.operation)) continue
      syncStatus.value = 'saving'
      if (!record.operation) {
        record.operation = {
          kind: record.kind,
          name: record.name,
          payload: clone(record.payload),
          archived: record.archived,
          deleted: record.deleted,
          revision: record.revision,
          operationId: crypto.randomUUID(),
        }
        record.dirty = false
      }
      await persist(record)
      const sent = record.operation
      try {
        const result = await api<{ revision: number }>(`/library/${record.id}`, 'PUT', sent)
        if (result?.revision !== sent.revision + 1) throw new ApiError('network', 0)
        if (stopped) return
        record.revision = result.revision
        record.operation = null
        await persist(record)
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          record.conflict = true
          await persist(record)
          continue
        }
        throw error
      }
    }
    syncStatus.value = [...records.values()].some((d) => d.conflict)
      ? 'conflict'
      : pending()
        ? 'pending'
        : 'saved'
    syncError.value = ''
    if (pending() && syncStatus.value !== 'conflict') schedule()
  } catch (error) {
    syncError.value = error instanceof ApiError ? error.code : 'storage'
    syncStatus.value = syncError.value === 'network' ? 'offline' : 'error'
    if (syncStatus.value === 'offline') {
      clearTimeout(timer)
      timer = setTimeout(() => {
        void flush()
      }, 15000)
    }
  } finally {
    running = false
    refresh()
  }
}

export async function saveDocument(
  kind: DocumentKind,
  name: string,
  payload: unknown,
  id?: string,
) {
  const owner = account.value.user?.id
  if (!owner || stopped) return
  const documentId = id ?? crypto.randomUUID()
  let record = records.get(documentId)
  if (!record) {
    record = {
      id: documentId,
      key: `${owner}:${storageClient()}:${documentId}`,
      owner,
      client: storageClient(),
      kind,
      name,
      payload,
      revision: 0,
      updatedAt: Date.now(),
      archived: false,
      deleted: false,
      dirty: true,
      operation: null,
      conflict: false,
    }
    records.set(documentId, record)
  } else {
    record.name = name
    record.payload = clone(payload)
    record.updatedAt = Date.now()
    record.dirty = true
  }
  refresh()
  syncStatus.value = record.conflict ? 'conflict' : 'pending'
  await persist(record)
  schedule()
  return documentId
}
function activeId() {
  return accountStorage.getItem('active-save')
}
export function newAdventure() {
  accountStorage.removeItem('active-save')
}
export async function trackGame(raw: string) {
  const value = JSON.parse(raw)
  if (!value.campaign && !value.state) {
    newAdventure()
    return
  }
  const current = activeId()
  const name = current ? records.get(current)?.name : undefined
  // Assign before the async write so rapid changes cannot create duplicate campaigns.
  const id = current ?? crypto.randomUUID()
  accountStorage.setItem('active-save', id)
  await saveDocument('campaign', name ?? value.campaign?.id ?? value.state.scenarioId, value, id)
}
async function trackDecks(raw: string) {
  const decks = JSON.parse(raw) as DeckList[]
  const owned = [...records.values()].filter((d) => d.kind === 'deck' && !d.deleted)
  for (const deck of decks) {
    const existing = owned.find((d) => (d.payload as DeckList).id === deck.id)
    if (!existing || JSON.stringify(existing.payload) !== JSON.stringify(deck))
      await saveDocument('deck', deck.name, deck, existing?.id)
  }
  for (const old of owned)
    if (!decks.some((d) => d.id === (old.payload as DeckList).id))
      await editMetadata(old.id, { deleted: true })
}
export async function editMetadata(
  id: string,
  change: { name?: string; archived?: boolean; deleted?: boolean },
) {
  const record = records.get(id)
  if (!record) return
  Object.assign(record, change, { dirty: true, updatedAt: Date.now() })
  await persist(record)
  refresh()
  schedule()
  const wasActive = change.deleted && activeId() === id
  if (wasActive) {
    accountStorage.removeItem('active-save')
    accountStorage.removeItem(SESSION_KEY)
  }
  return !!wasActive
}
export async function refreshLibrary(initial = false) {
  const list = await api<{ documents: CloudMetadata[] }>('/library')
  for (const remote of list.documents) {
    const local = records.get(remote.id)
    if (local?.dirty || local?.operation || local?.conflict) continue
    if (local && local.revision === remote.revision) continue
    if (!initial && local && activeId() === remote.id) {
      local.conflict = true
      await persist(local)
      syncStatus.value = 'conflict'
      continue
    }
    if (remote.deleted) {
      if (local) {
        Object.assign(local, remote)
        await persist(local)
      }
      continue
    }
    const doc = await api<CloudDocument>(`/library/${remote.id}`)
    const latest = records.get(doc.id)
    if (latest?.dirty || latest?.operation || latest?.conflict) continue
    const record: CachedDocument = {
      ...doc,
      key: `${account.value.user!.id}:${storageClient()}:${doc.id}`,
      client: storageClient(),
      owner: account.value.user!.id,
      dirty: false,
      operation: null,
      conflict: false,
    }
    records.set(doc.id, record)
    await persist(record)
  }
  restoreWorkingDecks()
  refresh()
}
export async function resolveConflict(id: string, keepLocal: boolean, copyName?: string) {
  const record = records.get(id)
  if (!record) return
  if (keepLocal && !record.deleted) {
    const name = (copyName ?? `${record.name} (copy)`).slice(0, 160)
    const payload =
      record.kind === 'deck'
        ? { ...(record.payload as DeckList), id: crypto.randomUUID(), name }
        : record.payload
    await saveDocument(record.kind, name, payload)
  }
  const remote = await api<CloudDocument>(`/library/${id}`).catch((error) => {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  })
  if (remote) Object.assign(record, remote)
  else record.deleted = true
  record.operation = null
  record.dirty = false
  record.conflict = false
  await persist(record)
  refresh()
  // The working copy is not silently overwritten. Reopen the desired campaign from the library.
  const wasActive = activeId() === id
  if (wasActive) {
    accountStorage.removeItem('active-save')
    accountStorage.removeItem(SESSION_KEY)
  }
  restoreWorkingDecks()
  schedule()
  return wasActive
}
export async function activateCampaign(id: string, load: (raw: string) => boolean) {
  const record = records.get(id)
  if (!record || record.deleted || record.conflict) return false
  const raw = JSON.stringify(record.payload)
  decodeSession(raw)
  accountStorage.setItem('active-save', id)
  return load(raw)
}
export async function importGuest() {
  const rawDecks = localStorage.getItem('lcg:decks') ?? '[]'
  const rawGame = localStorage.getItem(SESSION_KEY)
  if (rawGame) decodeSession(rawGame)
  // Stable mapping makes interrupted imports resumable across reloads.
  const importKey = `lcg:user:${account.value.user!.id}:guest-import`
  const mappings: Record<string, string> = JSON.parse(localStorage.getItem(importKey) ?? '{}')
  const map = (key: string) => {
    const id = (mappings[key] ??= crypto.randomUUID())
    localStorage.setItem(importKey, JSON.stringify(mappings))
    return id
  }
  for (const deck of JSON.parse(rawDecks) as DeckList[]) {
    if (
      !deck ||
      typeof deck.id !== 'string' ||
      !Array.isArray(deck.cards) ||
      typeof deck.name !== 'string'
    )
      throw new Error('invalid')
    const id = map(`deck:${deck.id}`)
    if (!records.has(id)) await saveDocument('deck', deck.name, deck, id)
  }
  if (rawGame && (JSON.parse(rawGame).state || JSON.parse(rawGame).campaign)) {
    const id = map('campaign')
    if (!records.has(id))
      await saveDocument(
        'campaign',
        JSON.parse(rawGame).campaign?.id ?? 'Imported campaign',
        JSON.parse(rawGame),
        id,
      )
  }
  const rewards = JSON.parse(localStorage.getItem('lcg:rewards') ?? '[]')
  if (Array.isArray(rewards)) {
    const existing = [...records.values()].find((d) => d.kind === 'rewards')
    await saveDocument(
      'rewards',
      'Rewards',
      [...new Set([...((existing?.payload as string[]) ?? []), ...rewards])],
      existing?.id,
    )
  }
  await flush()
  restoreWorkingDecks()
}
function restoreWorkingDecks() {
  const live = [...records.values()].filter((d) => !d.deleted)
  accountStorage.setItem(
    'lcg:decks',
    JSON.stringify(live.filter((d) => d.kind === 'deck').map((d) => d.payload)),
  )
  accountStorage.setItem(
    'lcg:rewards',
    JSON.stringify([
      ...new Set(live.filter((d) => d.kind === 'rewards').flatMap((d) => d.payload as string[])),
    ]),
  )
}
export async function initializeLibrary() {
  const owner = account.value.user?.id
  if (!owner) return
  onLocalChange((kind, raw) => {
    const task =
      kind === 'game'
        ? trackGame(raw)
        : kind === 'decks'
          ? trackDecks(raw)
          : saveDocument(
              'rewards',
              'Rewards',
              JSON.parse(raw),
              [...records.values()].find((d) => d.kind === 'rewards')?.id,
            )
    void task.catch(() => {
      syncStatus.value = 'error'
      syncError.value = 'storage'
    })
  })
  window.addEventListener('online', () => {
    void flush()
  })
  try {
    for (const record of await cache.all())
      if (record.owner === owner) {
        if (record.client === storageClient()) records.set(record.id, record)
        else if (record.dirty || record.operation || record.conflict)
          recoveries.value = [...recoveries.value, record]
      }
    // A tab can close after its synchronous save but before IndexedDB commits.
    // Recover that working copy before fetching remote versions; conflicts stay explicit.
    const workingId = activeId(),
      workingRaw = accountStorage.getItem(SESSION_KEY)
    if (
      workingId &&
      workingRaw &&
      canonical(records.get(workingId)?.payload) !== canonical(JSON.parse(workingRaw))
    ) {
      decodeSession(workingRaw)
      await trackGame(workingRaw)
    }
    refresh()
    try {
      await refreshLibrary(true)
    } catch {
      syncStatus.value = 'offline'
      syncError.value = 'network'
    }
    restoreWorkingDecks()
    const active = records.get(activeId() ?? '')
    if (active && !active.conflict && !active.deleted)
      accountStorage.setItem(SESSION_KEY, JSON.stringify(active.payload))
    else if (active?.deleted && !active.conflict) {
      newAdventure()
      accountStorage.removeItem(SESSION_KEY)
    }
    refresh()
    void flush()
  } catch {
    refresh()
    syncStatus.value = 'error'
    syncError.value = 'storage'
  }
}
export async function stopLibrary(clearLocal = false) {
  stopped = true
  clearTimeout(timer)
  await flushing
  await durable
  if (clearLocal && account.value.user) {
    const owner = account.value.user.id
    await cache.clearOwner(owner)
    for (const key of Object.keys(localStorage))
      if (key.startsWith(`lcg:user:${owner}:`)) localStorage.removeItem(key)
  }
}
