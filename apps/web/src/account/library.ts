import { shallowRef } from 'vue'
import type { CloudDocument, CloudMetadata, DocumentKind, DocumentWrite } from '@lcg/shared'
import { canonical, decodeSession, SESSION_KEY } from '@lcg/saves'
import type { DeckList } from '@lcg/cards'
import { account, api, ApiError, recoverAccountSession } from './api'
import { accountStorage, onLocalChange, tabStorage } from './storage'

export interface LibraryDocument extends CloudDocument {
  dirty: boolean
  operation: DocumentWrite | null
  conflict: boolean
}
export const documents = shallowRef<LibraryDocument[]>([])
export const syncStatus = shallowRef('saving')
export const syncError = shallowRef('')
const records = new Map<string, LibraryDocument>()
let running = false,
  stopped = false,
  loaded = false
let flushing: Promise<void> | undefined
let timer: ReturnType<typeof setTimeout> | undefined
let unsubscribe: (() => void) | undefined
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const refresh = () => {
  documents.value = [...records.values()].map(clone)
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

/** Keep in-flight writes stable in memory until the server acknowledges them. */
export function flush(): Promise<void> {
  return (flushing ??= runFlush().finally(() => {
    flushing = undefined
  }))
}
async function runFlush() {
  if (running || stopped || !account.value.user || !pending()) return
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
      const sent = record.operation
      try {
        const result = await api<{ revision: number }>(`/library/${record.id}`, 'PUT', sent)
        if (result?.revision !== sent.revision + 1) throw new ApiError('network', 0)
        if (stopped) return
        record.revision = result.revision
        record.operation = null
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          record.conflict = true
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
    syncError.value = error instanceof ApiError ? error.code : 'internal'
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
  if (!loaded) throw new ApiError('network', 0)
  const documentId = id ?? crypto.randomUUID()
  let record = records.get(documentId)
  if (!record) {
    record = {
      id: documentId,
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
  schedule()
  return documentId
}
function activeId() {
  return accountStorage.getItem('active-save')
}
/**
 * The open adventure is remembered in this tab so a reload reopens it, but it only
 * reaches the library when the player saves it. `id` is the library entry it was
 * opened from or saved to, and `base` the server revision the copy builds on: while
 * the server has not gone past it, the copy holds changes that were not saved.
 */
interface TabAdventure {
  id: string | null
  base: number
  payload: unknown
}
/** The open adventure has changes that are not in the library. */
export const unsavedGame = shallowRef(false)
const tabKey = () => `lcg:active-adventure:${account.value.user?.id}`
function rememberAdventure(id: string | null, base: number, payload: unknown) {
  const value: TabAdventure = { id, base, payload }
  tabStorage((storage) => {
    try {
      storage.setItem(tabKey(), JSON.stringify(value))
    } catch {
      // Full: the reload reopens the library copy, without the latest changes.
      storage.setItem(tabKey(), JSON.stringify({ id, base: -1, payload: null }))
    }
  })
}
const baseRevision = (record: LibraryDocument) =>
  record.operation ? record.operation.revision + 1 : record.revision
export function newAdventure() {
  accountStorage.removeItem('active-save')
  tabStorage((storage) => storage.removeItem(tabKey()))
  unsavedGame.value = false
}
const isEmpty = (value: { campaign?: unknown; state?: unknown }) => !value.campaign && !value.state
/** Keep the open adventure in this tab; the library only changes with `saveGame`. */
export function trackGame(raw: string) {
  const value = JSON.parse(raw)
  if (isEmpty(value)) {
    newAdventure()
    return
  }
  const id = activeId()
  const record = id ? records.get(id) : undefined
  unsavedGame.value = !record || canonical(record.payload) !== canonical(value)
  rememberAdventure(id, record ? baseRevision(record) : -1, value)
}
/** Save the open adventure to the library, as a new entry the first time. */
export async function saveGame(raw: string) {
  const value = JSON.parse(raw)
  if (isEmpty(value)) return
  // Assign before the async write so repeated saves cannot create duplicate entries.
  const id = activeId() ?? crypto.randomUUID()
  accountStorage.setItem('active-save', id)
  const name = records.get(id)?.name ?? value.campaign?.id ?? value.state.scenarioId
  await saveDocument('campaign', name, value, id)
  const record = records.get(id)
  if (record && activeId() === id) {
    rememberAdventure(id, baseRevision(record), value)
    unsavedGame.value = false
  }
  await flush()
}
async function trackDecks(raw: string) {
  if (!loaded) throw new ApiError('network', 0)
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
  syncStatus.value = record.conflict ? 'conflict' : 'pending'
  refresh()
  schedule()
  const wasActive = change.deleted && activeId() === id
  if (wasActive) {
    newAdventure()
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
      syncStatus.value = 'conflict'
      continue
    }
    if (remote.deleted) {
      if (local) {
        Object.assign(local, remote)
      }
      continue
    }
    const doc = await api<CloudDocument>(`/library/${remote.id}`)
    const latest = records.get(doc.id)
    if (latest?.dirty || latest?.operation || latest?.conflict) continue
    const record: LibraryDocument = {
      ...doc,
      dirty: false,
      operation: null,
      conflict: false,
    }
    records.set(doc.id, record)
  }
  loaded = true
  syncError.value = ''
  if ([...records.values()].some((d) => d.conflict)) syncStatus.value = 'conflict'
  else if (!pending()) syncStatus.value = 'saved'
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
  refresh()
  // The working copy is not silently overwritten. Reopen the desired campaign from the library.
  const wasActive = activeId() === id
  if (wasActive) {
    newAdventure()
    accountStorage.removeItem(SESSION_KEY)
  }
  restoreWorkingDecks()
  schedule()
  return wasActive
}
export async function activateCampaign(id: string, load: (raw: string) => boolean) {
  await flush()
  await refreshLibrary()
  const record = records.get(id)
  if (!record || record.deleted || record.conflict) return false
  const raw = JSON.stringify(record.payload)
  decodeSession(raw)
  accountStorage.setItem('active-save', id)
  rememberAdventure(id, record.revision, record.payload)
  unsavedGame.value = false
  return load(raw)
}
/** Reopen the adventure this tab had open, keeping the changes that were not saved. */
function reopenAdventure() {
  const saved = tabStorage((storage) => {
    const raw = storage.getItem(tabKey())
    return raw ? (JSON.parse(raw) as TabAdventure) : null
  })
  if (!saved) return
  const record = saved.id ? records.get(saved.id) : undefined
  if ((saved.id && (!record || record.deleted)) || (!record && saved.payload == null)) {
    newAdventure()
    return
  }
  const local =
    saved.payload != null &&
    (!record ||
      (saved.base >= record.revision && canonical(saved.payload) !== canonical(record.payload)))
  const payload = local ? saved.payload : record!.payload
  try {
    const raw = JSON.stringify(payload)
    decodeSession(raw)
    if (record) accountStorage.setItem('active-save', record.id)
    accountStorage.setItem(SESSION_KEY, raw)
    unsavedGame.value = local
  } catch {
    accountStorage.removeItem(SESSION_KEY)
    newAdventure()
  }
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
  if (!account.value.user) return
  stopped = false
  unsubscribe?.()
  unsubscribe = onLocalChange((kind, raw) => {
    if (kind === 'game') {
      trackGame(raw)
      return
    }
    const task =
      kind === 'decks'
        ? trackDecks(raw)
        : saveDocument(
            'rewards',
            'Rewards',
            JSON.parse(raw),
            [...records.values()].find((d) => d.kind === 'rewards')?.id,
          )
    void task.catch((error) => {
      syncError.value = error instanceof ApiError ? error.code : 'internal'
      syncStatus.value = syncError.value === 'network' ? 'offline' : 'error'
    })
  })
  try {
    await refreshLibrary(true)
    syncStatus.value = 'saved'
    syncError.value = ''
    reopenAdventure()
  } catch (error) {
    syncStatus.value = 'offline'
    syncError.value = error instanceof ApiError ? error.code : 'internal'
  }
}
export async function stopLibrary() {
  stopped = true
  clearTimeout(timer)
  unsubscribe?.()
  unsubscribe = undefined
  await flushing
  newAdventure()
  loaded = false
  records.clear()
  accountStorage.clear()
  refresh()
}
