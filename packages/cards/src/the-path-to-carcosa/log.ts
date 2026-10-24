import type { CampaignLog, ChaosToken, GameState, Message } from '@lcg/engine'

export const CARCOSA_COUNTERS = {
  doubt: 'carcosaDoubt',
  conviction: 'carcosaConviction',
  chasing: 'carcosaChasingTheStranger',
} as const
export type CarcosaCounter = keyof typeof CARCOSA_COUNTERS

/** Guía ES p. 2: contadores compartidos, independientes; el empate no favorece ninguno. */
export function carcosaCount(log: CampaignLog | undefined, counter: CarcosaCounter): number {
  const value = Number(log?.values[CARCOSA_COUNTERS[counter]] ?? 0)
  return Number.isSafeInteger(value) && value >= 0 ? value : 0
}

export function carcosaBelief(log: CampaignLog | undefined): 'doubt' | 'conviction' | 'tie' {
  const difference = carcosaCount(log, 'doubt') - carcosaCount(log, 'conviction')
  return difference > 0 ? 'doubt' : difference < 0 ? 'conviction' : 'tie'
}

/** Evalúa la cifra al resolver el mensaje, para que las marcas consecutivas se acumulen. */
export function markCarcosa(counter: CarcosaCounter, amount = 1): Message {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('Invalid Carcosa mark count')
  return { type: 'ScenarioSpecific', key: 'carcosaMark', data: { counter, amount } }
}

export function applyCarcosaMark(
  state: GameState,
  counter: CarcosaCounter,
  amount: number,
): GameState {
  const log = state.campaignLog
  if (!log || amount === 0) return state
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('Invalid Carcosa mark count')
  const key = CARCOSA_COUNTERS[counter]
  return {
    ...state,
    campaignLog: {
      ...log,
      notes: log.notes.includes(key) ? log.notes : [...log.notes, key],
      values: { ...log.values, [key]: String(carcosaCount(log, counter) + amount) },
    },
  }
}

const SYMBOLS: ChaosToken[] = ['cultist', 'tablet', 'elderThing']

/** Retira de la bolsa de la campaña las fichas de sectario, tablilla y primigenio y añade estas. */
export function replaceSymbolTokens(...add: ChaosToken[]): Message {
  return { type: 'ScenarioSpecific', key: 'carcosaTokens', data: { add: add.join(',') } }
}

/** Mensajes comunes de los escenarios de Carcosa (marcas y fichas); null si no es uno de ellos. */
export function carcosaSpecific(
  state: GameState,
  key: string,
  data: Record<string, string | number | boolean>,
): GameState | null {
  if (key === 'carcosaMark') {
    if (typeof data.counter !== 'string' || !Object.hasOwn(CARCOSA_COUNTERS, data.counter))
      return state
    return applyCarcosaMark(state, data.counter as CarcosaCounter, Number(data.amount))
  }
  if (key === 'carcosaTokens') {
    const log = state.campaignLog
    if (!log) return state
    const add = String(data.add ?? '')
      .split(',')
      .filter(Boolean) as ChaosToken[]
    return {
      ...state,
      campaignLog: {
        ...log,
        chaosTokens: [...log.chaosTokens.filter((t) => !SYMBOLS.includes(t)), ...add],
      },
    }
  }
  return null
}

/** Nota del registro que sigue vigente (anotada y sin tachar). */
export const hasNote = (log: CampaignLog | undefined, note: string) =>
  !!log?.notes.includes(note) && !log.crossedOut.includes(note)
