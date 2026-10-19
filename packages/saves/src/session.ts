import { allCampaigns, campaignDefinition, startScenario, type Campaign } from '@lcg/cards'
import {
  applyInput,
  ENGINE_VERSION,
  playerCardDef,
  scenarioBehavior,
  type GameState,
  type PlayerInput,
} from '@lcg/engine'
import { markOf, type Mark } from './undo'
import { validAdvanceReview, type AdvanceFrame } from './advanceReview'

export const SESSION_KEY = 'lcg:session:v1'
export const BACKUP_KEY = 'lcg:session:backup:v1'
export const RECOVERY_KEY = 'lcg:session:unreadable:v1'
export const CONTENT_VERSION = 'brethren-of-ash:2026-10-17'
const MAX_BYTES = 20_000_000
const MAX_INPUTS = 30_000
const verifiedWrites = new WeakMap<StoragePort, string>()

export interface History {
  base: GameState
  inputs: PlayerInput[]
  marks: Mark[]
}

export interface Session {
  format: 'lcg-session'
  version: 1
  content: string
  state: GameState | null
  history: History | null
  campaign: Campaign | null
  /** Optional visual acknowledgements. They never change engine inputs or rules. */
  advanceReview?: AdvanceFrame[]
}

export interface StoragePort {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}
export type SessionIssue = 'unavailable' | 'invalid' | 'incompatible' | 'recovered' | 'historyReset'

export class SessionError extends Error {
  constructor(public readonly reason: SessionIssue) {
    super(reason)
  }
}

function fail(reason: SessionIssue = 'invalid'): never {
  throw new SessionError(reason)
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v)
const strings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((s) => typeof s === 'string')
const integer = (v: unknown): v is number => Number.isSafeInteger(v)
const difficulties = ['easy', 'standard', 'hard', 'expert']

/** Also rejects non-JSON values and unsafe property names before touching the engine. */
function jsonTree(value: unknown, depth = 0): void {
  if (depth > 90) fail()
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return
  if (typeof value === 'number' && Number.isFinite(value)) return
  if (Array.isArray(value)) {
    if (value.length > 100_000) fail()
    value.forEach((v) => jsonTree(v, depth + 1))
    return
  }
  if (!object(value)) fail()
  for (const [key, v] of Object.entries(value)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) fail()
    jsonTree(v, depth + 1)
  }
}

function game(value: unknown): asserts value is GameState {
  if (!object(value)) fail()
  if (value.engineVersion !== ENGINE_VERSION) fail('incompatible')
  const rulesVersion = scenarioBehavior(String(value.scenarioId))?.rulesVersion
  if (rulesVersion !== undefined && value.scenarioRulesVersion !== rulesVersion)
    fail('incompatible')
  if (value.interactive === false) fail('incompatible')
  if (
    !allCampaigns().some((c) => c.scenarios.some((s) => s.id === value.scenarioId)) ||
    !difficulties.includes(String(value.difficulty)) ||
    typeof value.interactive !== 'boolean' ||
    !integer(value.rng) ||
    !integer(value.round) ||
    Number(value.round) < 0 ||
    !integer(value.nextId) ||
    !integer(value.startingInvestigatorCount) ||
    !['setup', 'mythos', 'investigation', 'enemy', 'upkeep'].includes(String(value.phase)) ||
    !Array.isArray(value.investigators) ||
    value.investigators.length < 1 ||
    value.investigators.length > 4
  )
    fail()
  const ids = new Set<string>()
  for (const i of value.investigators) {
    if (!object(i) || typeof i.id !== 'string' || ids.has(i.id) || typeof i.name !== 'string')
      fail()
    ids.add(i.id)
    const skills = i.skills
    if (
      !object(skills) ||
      !['willpower', 'intellect', 'combat', 'agility'].every((k) => integer(skills[k]))
    )
      fail()
    if (!['deck', 'hand', 'discard'].every((k) => strings(i[k]))) fail()
    if (
      !['damage', 'horror', 'health', 'sanity', 'resources', 'clues', 'actionsRemaining'].every(
        (k) => integer(i[k]),
      )
    )
      fail()
    if (!['turnTaken', 'eliminated', 'resigned'].every((k) => typeof i[k] === 'boolean')) fail()
    if (i.location !== null && typeof i.location !== 'string') fail()
    if (
      playerCardDef(i.id)?.type !== 'investigator' ||
      ![...(i.deck as string[]), ...(i.hand as string[]), ...(i.discard as string[])].every(
        (code) => playerCardDef(code),
      )
    )
      fail('incompatible')
  }
  for (const k of [
    'locations',
    'enemies',
    'assets',
    'treacheries',
    'setAsideLocations',
    'tokenValues',
  ]) {
    if (!object(value[k])) fail()
  }
  for (const [id, l] of Object.entries(value.locations as Record<string, unknown>)) {
    if (
      !object(l) ||
      l.id !== id ||
      typeof l.name !== 'string' ||
      !strings(l.connections) ||
      !['shroud', 'clues', 'clueValue'].every((k) => integer(l[k])) ||
      typeof l.revealed !== 'boolean'
    )
      fail()
  }
  for (const [id, e] of Object.entries(value.enemies as Record<string, unknown>)) {
    if (
      !object(e) ||
      e.id !== id ||
      e.kind !== 'enemy' ||
      typeof e.code !== 'string' ||
      typeof e.name !== 'string' ||
      typeof e.location !== 'string' ||
      !['fight', 'health', 'evade', 'damage', 'horror', 'damageTaken'].every((k) =>
        integer(e[k]),
      ) ||
      !Array.isArray(e.keywords) ||
      typeof e.exhausted !== 'boolean'
    )
      fail()
  }
  for (const [id, a] of Object.entries(value.assets as Record<string, unknown>)) {
    if (
      !object(a) ||
      a.id !== id ||
      typeof a.code !== 'string' ||
      !playerCardDef(a.code) ||
      !ids.has(String(a.owner)) ||
      typeof a.exhausted !== 'boolean' ||
      !integer(a.damage) ||
      !integer(a.horror) ||
      !integer(a.uses)
    )
      fail()
  }
  if (
    !Array.isArray(value.queue) ||
    !value.queue.every((m) => object(m) && typeof m.type === 'string')
  )
    fail()
  for (const k of [
    'agendas',
    'acts',
    'chaosBag',
    'encounterDeck',
    'encounterDiscard',
    'setAside',
    'abilityUses',
    'log',
    'queue',
    'victoryDisplay',
  ]) {
    if (!Array.isArray(value[k])) fail()
  }
  for (const [cards, index] of [
    ['agendas', 'agendaIndex'],
    ['acts', 'actIndex'],
  ] as const) {
    const list = value[cards] as unknown[]
    if (
      !list.length ||
      !integer(value[index]) ||
      Number(value[index]) < 0 ||
      Number(value[index]) >= list.length
    )
      fail()
    if (!list.every((c) => object(c) && typeof c.name === 'string')) fail()
  }
  if (
    !integer(value.doom) ||
    !('pending' in value) ||
    !('outcome' in value) ||
    !('skillTest' in value)
  )
    fail()
  if (value.campaignLog !== undefined) {
    const log = value.campaignLog
    if (
      !object(log) ||
      !strings(log.notes) ||
      !strings(log.crossedOut) ||
      !object(log.values) ||
      !object(log.investigators) ||
      !Array.isArray(log.chaosTokens)
    )
      fail()
    for (const id of ids) {
      const r = log.investigators[id]
      if (
        !object(r) ||
        !integer(r.xp) ||
        !integer(r.physicalTrauma) ||
        !integer(r.mentalTrauma) ||
        !strings(r.storyAssets)
      )
        fail()
    }
  }
  if (value.pending !== null) {
    const p = value.pending
    if (!object(p) || !ids.has(String(p.investigator)) || !object(p.question)) fail()
    const q = p.question
    if (
      q.kind !== 'chooseOne' ||
      typeof q.prompt !== 'string' ||
      !Array.isArray(q.choices) ||
      !q.choices.length
    )
      fail()
    if (!q.choices.every((c) => object(c) && typeof c.label === 'string' && Array.isArray(c.then)))
      fail()
  }
  if (
    value.outcome !== null &&
    (!object(value.outcome) || !['resolution', 'noResolution'].includes(String(value.outcome.type)))
  )
    fail()
  if (
    object(value.outcome) &&
    value.outcome.type === 'resolution' &&
    (!integer(value.outcome.resolution) ||
      value.outcome.resolution < 1 ||
      value.outcome.resolution > (value.scenarioId === 'the-midwinter-gala' ? 6 : 3))
  )
    fail()
  if (value.skillTest !== null) {
    const test = value.skillTest
    if (
      !object(test) ||
      !ids.has(String(test.investigator)) ||
      !['willpower', 'intellect', 'combat', 'agility'].includes(String(test.skill)) ||
      !integer(test.difficulty) ||
      !Array.isArray(test.committed) ||
      !Array.isArray(test.tokens) ||
      !object(test.kind) ||
      !['fight', 'evade', 'investigate', 'effect'].includes(String(test.kind.type))
    )
      fail()
  }
  if (value.outcome === null && value.pending === null) fail()
}

function campaign(value: unknown): asserts value is Campaign {
  if (
    !object(value) ||
    typeof value.id !== 'string' ||
    !difficulties.includes(String(value.difficulty))
  )
    fail()
  let count: number
  try {
    count = campaignDefinition(value.id).scenarios.length
  } catch {
    return fail('incompatible')
  }
  if (
    !integer(value.scenarioIndex) ||
    Number(value.scenarioIndex) < 0 ||
    Number(value.scenarioIndex) > count
  )
    fail()
  if (
    !Array.isArray(value.investigators) ||
    !value.investigators.length ||
    value.investigators.length > 4
  )
    fail()
  if (
    !object(value.log) ||
    !object(value.log.investigators) ||
    !strings(value.log.notes) ||
    !strings(value.log.crossedOut) ||
    !object(value.log.values) ||
    !Array.isArray(value.log.chaosTokens)
  )
    fail()
  const ids = new Set<string>()
  for (const i of value.investigators) {
    if (!object(i) || typeof i.id !== 'string' || ids.has(i.id) || !strings(i.deck)) fail()
    ids.add(i.id)
    if (
      playerCardDef(i.id)?.type !== 'investigator' ||
      !i.deck.every((code) => playerCardDef(code))
    )
      fail('incompatible')
    const r = value.log.investigators[i.id]
    if (
      !object(r) ||
      !['xp', 'physicalTrauma', 'mentalTrauma'].every((k) => integer(r[k]) && Number(r[k]) >= 0) ||
      !strings(r.storyAssets)
    )
      fail()
  }
  if (!Array.isArray(value.results) || value.results.length !== value.scenarioIndex) fail()
  const definition = campaignDefinition(value.id)
  value.results.forEach((r, n) => {
    if (
      !object(r) ||
      r.scenario !== definition.scenarios[n]?.id ||
      !object(r.outcome) ||
      !object(r.xp)
    )
      fail()
  })
  // Validate investigators and deck codes through the same content registry used by play.
  const records = value.log.investigators
  if (
    value.scenarioIndex < count &&
    value.investigators.some((i) => {
      const r = records[i.id] as Record<string, unknown>
      return !r.killed && !r.insane
    })
  ) {
    try {
      startScenario(value as unknown as Campaign, 1)
    } catch {
      fail()
    }
  }
}

/** Rebuild marks rather than trusting imported undo positions. */
export function replay(
  base: GameState,
  inputs: readonly PlayerInput[],
): { state: GameState; history: History } {
  game(base)
  if (inputs.length > MAX_INPUTS) fail()
  let state = base
  const marks = [markOf(base)]
  for (const input of inputs) {
    if (
      !object(input) ||
      typeof input.investigator !== 'string' ||
      !integer(input.choice) ||
      input.choice < 0
    )
      fail()
    try {
      state = applyInput(state, input)
    } catch {
      fail()
    }
    marks.push(markOf(state))
  }
  return { state, history: { base, inputs: [...inputs], marks } }
}

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (object(value))
    return `{${Object.keys(value)
      .filter((k) => value[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`)
      .join(',')}}`
  return JSON.stringify(value)
}

export function session(
  state: GameState | null,
  history: History | null,
  campaign: Campaign | null,
  advanceReview?: AdvanceFrame[],
): Session {
  return {
    format: 'lcg-session',
    version: 1,
    content: CONTENT_VERSION,
    state,
    history,
    campaign,
    ...(advanceReview !== undefined ? { advanceReview } : {}),
  }
}

export function decodeSession(raw: string, verifyHistory = true): Session {
  if (raw.length > MAX_BYTES) fail()
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return fail()
  }
  jsonTree(value)
  if (!object(value) || value.format !== 'lcg-session') fail()
  if (value.version !== 1 || value.content !== CONTENT_VERSION) fail('incompatible')
  if (
    value.advanceReview !== undefined &&
    (!validAdvanceReview(value.advanceReview) ||
      (value.state === null && value.advanceReview.length > 0))
  )
    fail()
  if (value.campaign !== null) campaign(value.campaign)
  if (value.state === null) {
    if (value.history !== null) fail()
  } else {
    game(value.state)
    if (!object(value.history) || !Array.isArray(value.history.inputs)) fail()
    if (verifyHistory) {
      const restored = replay(
        value.history.base as GameState,
        value.history.inputs as PlayerInput[],
      )
      if (canonical(restored.state) !== canonical(value.state)) fail()
      value.history = restored.history
    } else {
      // Cloud storage validates structure, never executes untrusted histories in the HTTP loop.
      game(value.history.base)
      if (
        value.history.inputs.length > MAX_INPUTS ||
        !value.history.inputs.every(
          (input) =>
            object(input) &&
            typeof input.investigator === 'string' &&
            integer(input.choice) &&
            Number(input.choice) >= 0,
        )
      )
        fail()
    }
    if (value.campaign) {
      const c = value.campaign as Campaign
      const expected = campaignDefinition(c.id).scenarios[c.scenarioIndex]?.id
      if (
        value.state.scenarioId !== expected ||
        value.state.difficulty !== c.difficulty ||
        !value.state.investigators.every((i) => c.investigators.some((m) => m.id === i.id))
      )
        fail()
    }
  }
  return value as unknown as Session
}

export function readSession(storage: StoragePort): { data: Session; issue?: SessionIssue } {
  let raw: string | null
  try {
    raw = storage.getItem(SESSION_KEY)
  } catch {
    return { data: session(null, null, null), issue: 'unavailable' }
  }
  if (raw) {
    try {
      return { data: decodeSession(raw) }
    } catch (e) {
      try {
        const backup = storage.getItem(BACKUP_KEY)
        if (backup) return { data: decodeSession(backup), issue: 'recovered' }
      } catch {
        /* Leave both originals intact for recovery. */
      }
      return {
        data: session(null, null, null),
        issue: e instanceof SessionError ? e.reason : 'invalid',
      }
    }
  }
  // Migration from the three keys used before session format 1. Never deletes originals.
  try {
    const oldState = storage.getItem('lcg:game')
    const oldCampaign = storage.getItem('lcg:campaign')
    if (!oldState && !oldCampaign) return { data: session(null, null, null) }
    const s: GameState | null = oldState ? JSON.parse(oldState) : null
    const c: Campaign | null = oldCampaign ? JSON.parse(oldCampaign) : null
    if (s) game(s)
    if (c) campaign(c)
    let h: History | null = s ? { base: s, inputs: [], marks: [markOf(s)] } : null
    let reset = false
    if (s) {
      try {
        const rawHistory = storage.getItem('lcg:history')
        if (!rawHistory) throw new Error('missing')
        const old = JSON.parse(rawHistory) as History
        const rebuilt = replay(old.base, old.inputs)
        if (canonical(rebuilt.state) !== canonical(s)) throw new Error('mismatch')
        h = rebuilt.history
      } catch {
        reset = true
      }
    }
    const data = decodeSession(JSON.stringify(session(s, h, c)))
    return { data, ...(reset ? { issue: 'historyReset' as const } : {}) }
  } catch (e) {
    return {
      data: session(null, null, null),
      issue: e instanceof SessionError ? e.reason : 'invalid',
    }
  }
}

/** One atomic write for game + campaign + undo; only a readable previous save becomes backup. */
export function writeSession(storage: StoragePort, data: Session): void {
  const raw = JSON.stringify(data)
  if (raw.length > MAX_BYTES) fail()
  // Validate before any write, including the backup. Never replace a readable
  // campaign with a partial state or an undo history that cannot reproduce it.
  decodeSession(raw)
  try {
    const previous = storage.getItem(SESSION_KEY)
    if (previous) {
      let valid = false
      try {
        if (verifiedWrites.get(storage) !== previous) decodeSession(previous)
        valid = true
      } catch {
        /* Preserve an older good backup. */
      }
      if (valid) storage.setItem(BACKUP_KEY, previous)
      else if (!storage.getItem(RECOVERY_KEY)) storage.setItem(RECOVERY_KEY, previous)
    }
    storage.setItem(SESSION_KEY, raw)
    verifiedWrites.set(storage, raw)
  } catch (e) {
    if (e instanceof SessionError) throw e
    fail('unavailable')
  }
}

/** Local incident package: decoding replays the complete successful history. */
export function reproduceDiagnostic(raw: string) {
  // Formatted session plus a preserved original can exceed the compact save size.
  if (raw.length > MAX_BYTES * 6) fail()
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return fail()
  }
  jsonTree(value)
  if (!object(value) || value.format !== 'lcg-diagnostic' || value.version !== 1) fail()
  const data = decodeSession(JSON.stringify(value.session))
  let reproducedError: string | null = null
  let after = data.state
  if (value.failedInput !== null && value.failedInput !== undefined) {
    const input = value.failedInput
    if (
      !object(input) ||
      typeof input.investigator !== 'string' ||
      !integer(input.choice) ||
      input.choice < 0 ||
      !data.state
    )
      fail()
    try {
      after = applyInput(data.state, input as unknown as PlayerInput)
    } catch (e) {
      reproducedError = e instanceof Error ? e.message : String(e)
    }
  }
  return {
    data,
    after,
    recordedError: typeof value.error === 'string' ? value.error : null,
    reproducedError,
  }
}
