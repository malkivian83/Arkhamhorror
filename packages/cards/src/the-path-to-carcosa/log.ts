import type { CampaignLog, GameState, Message } from '@lcg/engine'

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
