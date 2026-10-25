import type { GameState } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { finishScenario, type Campaign } from '../campaign'
import '../index'
import { BLACK_STARS_RISE } from './black-stars-rise'
import { playRandom } from './echoes-playthrough.test'
import { afterThePhantom } from './pallid-playthrough.test'

/** Campaña tras La máscara pálida, con notas y marcas opcionales. */
export function afterThePallidMask(
  players: number,
  notes: string[] = [],
  values: Record<string, string> = {},
): Campaign {
  const campaign = afterThePhantom(players, notes, values)
  return {
    ...campaign,
    scenarioIndex: 6,
    results: [
      ...campaign.results,
      { scenario: 'the-pallid-mask', outcome: { type: 'resolution', resolution: 1 }, xp: {} },
    ],
  }
}

const VARIANTS: string[][] = [
  [],
  ['carcosaInterviewedAshleigh'],
  ['carcosaSlainAshleigh'],
  ['carcosaInterviewedAshleigh', 'carcosaKnowTheSiteOfTheGate'],
]

describe('Black Stars Rise: complete games with random inputs', () => {
  it.each([1, 2, 3, 4])('%i investigator(s): 10 games reach a resolution', (players) => {
    for (let n = 0; n < 10; n++) {
      const campaign = afterThePallidMask(players, VARIANTS[n % VARIANTS.length])
      const state: GameState = playRandom(campaign, 2100 + n * 7 + players)
      expect(state.scenarioId).toBe(BLACK_STARS_RISE)
      expect(state.outcome, `seed ${n}`).not.toBeNull()
      const next = finishScenario(campaign, state)
      expect(next.scenarioIndex).toBe(7)
    }
  })
})
