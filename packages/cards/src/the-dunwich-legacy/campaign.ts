import type { ChaosToken, Difficulty } from '@lcg/engine'

/** Revised campaign guide, pp. 2–3. The opening pair may be played in either order. */
export const THE_DUNWICH_LEGACY = {
  id: 'the-dunwich-legacy',
  scenarios: [
    'extracurricular-activity',
    'the-house-always-wins',
    'the-miskatonic-museum',
    'the-essex-county-express',
    'blood-on-the-altar',
    'undimensioned-and-unseen',
    'where-doom-awaits',
    'lost-in-time-and-space',
  ],
} as const

const SYMBOLS: ChaosToken[] = ['skull', 'skull', 'cultist', 'autoFail', 'elderSign']

export const DUNWICH_CHAOS_BAGS: Record<Difficulty, ChaosToken[]> = {
  easy: [1, 1, 0, 0, 0, -1, -1, -1, -2, -2, ...SYMBOLS],
  standard: [1, 0, 0, -1, -1, -1, -2, -2, -3, -4, ...SYMBOLS],
  hard: [0, 0, 0, -1, -1, -2, -2, -3, -3, -4, -5, ...SYMBOLS],
  expert: [0, -1, -1, -2, -2, -3, -3, -4, -4, -5, -6, -8, ...SYMBOLS],
}
