import type { ChaosToken, Difficulty } from '@lcg/engine'

/** Guía revisada ES, p. 1. La campaña clásica, sin Regreso a… */
export const NIGHT_OF_THE_ZEALOT = {
  id: 'night-of-the-zealot',
  scenarios: ['the-gathering', 'the-midnight-masks', 'the-devourer-below'],
} as const

const SYMBOLS: ChaosToken[] = ['skull', 'skull', 'cultist', 'tablet', 'autoFail', 'elderSign']
export const ZEALOT_CHAOS_BAGS: Record<Difficulty, ChaosToken[]> = {
  easy: [1, 1, 0, 0, 0, -1, -1, -1, -2, -2, ...SYMBOLS],
  standard: [1, 0, 0, -1, -1, -1, -2, -2, -3, -4, ...SYMBOLS],
  hard: [0, 0, 0, -1, -1, -2, -2, -3, -3, -4, -5, ...SYMBOLS],
  expert: [0, -1, -1, -2, -2, -3, -3, -4, -4, -5, -6, -8, ...SYMBOLS],
}
