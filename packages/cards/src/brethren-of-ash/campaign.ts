import type { ChaosToken } from '@lcg/engine'

/** Campaña de la caja básica de 2026. Fuente: guía de campaña, página 2. */
export const BRETHREN_OF_ASH = {
  id: 'brethren-of-ash',
  scenarios: ['spreading-flames', 'smoke-and-mirrors', 'queen-of-ash'],
} as const

export type Difficulty = 'easy' | 'standard' | 'hard' | 'expert'

/** Las seis fichas con símbolo, comunes a todas las dificultades de esta campaña. */
const SYMBOLS: ChaosToken[] = ['skull', 'skull', 'tablet', 'elderThing', 'autoFail', 'elderSign']

export const CHAOS_BAGS: Record<Difficulty, ChaosToken[]> = {
  easy: [1, 1, 0, 0, 0, -1, -1, -1, -2, -2, ...SYMBOLS],
  standard: [1, 0, 0, -1, -1, -1, -2, -2, -3, -4, ...SYMBOLS],
  hard: [0, 0, 0, -1, -1, -2, -2, -3, -3, -4, -5, ...SYMBOLS],
  expert: [0, -1, -1, -2, -2, -3, -3, -4, -4, -5, -6, -8, ...SYMBOLS],
}
