import type { ChaosToken, Difficulty } from '@lcg/engine'

/** Guía revisada ES, páginas 2–3: campaña original, sin Regreso a Carcosa. */
export const THE_PATH_TO_CARCOSA = {
  id: 'the-path-to-carcosa',
  scenarios: [
    'curtain-call',
    'the-last-king',
    'echoes-of-the-past',
    'the-unspeakable-oath',
    'a-phantom-of-truth',
    'the-pallid-mask',
    'black-stars-rise',
    'dim-carcosa',
  ],
} as const

const SYMBOLS: ChaosToken[] = ['skull', 'skull', 'skull', 'autoFail', 'elderSign']

export const CARCOSA_CHAOS_BAGS: Record<Difficulty, ChaosToken[]> = {
  easy: [1, 1, 0, 0, 0, -1, -1, -1, -2, -2, ...SYMBOLS],
  standard: [1, 0, 0, -1, -1, -1, -2, -2, -3, -4, ...SYMBOLS],
  hard: [0, 0, 0, -1, -1, -2, -2, -3, -3, -4, -5, ...SYMBOLS],
  expert: [0, -1, -1, -2, -2, -3, -3, -4, -4, -5, -6, -8, ...SYMBOLS],
}
