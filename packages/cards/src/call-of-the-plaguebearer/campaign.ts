import type { ChaosToken, Difficulty } from '@lcg/engine'

export const CALL_OF_THE_PLAGUEBEARER = {
  id: 'call-of-the-plaguebearer',
  scenarios: [
    'late-risers',
    'night-on-the-town',
    'dead-by-dawn',
    'mourning-chorus',
    'high-noon-descent',
    'the-afternoon-war',
    'death-at-sundown',
    'the-midnight-hour',
  ],
} as const

// Guías EN/ES, inventario contrastado en docs-proyecto/94. Sin Antiguo inicial.
const SYMBOLS: ChaosToken[] = [
  'skull',
  'skull',
  'cultist',
  'tablet',
  'tablet',
  'autoFail',
  'elderSign',
]
export const PLAGUEBEARER_CHAOS_BAGS: Record<Difficulty, ChaosToken[]> = {
  easy: [1, 1, 1, 0, 0, 0, -1, -1, -1, -2, ...SYMBOLS],
  standard: [1, 0, 0, -1, -1, -1, -2, -2, -3, -4, ...SYMBOLS],
  hard: [0, 0, -1, -1, -2, -3, -3, -3, -4, -5, ...SYMBOLS],
  expert: [0, -1, -2, -2, -3, -3, -4, -4, -4, -6, ...SYMBOLS],
}
