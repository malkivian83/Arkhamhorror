import type { GameState } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { finishScenario, type Campaign } from '../campaign'
import '../index'
import { afterThePallidMask } from './bsr-playthrough.test'
import { DIM_CARCOSA } from './dim-carcosa'
import { playRandom } from './echoes-playthrough.test'

/** Campaña tras Surgen estrellas negras, con notas y marcas opcionales. */
export function afterBlackStars(
  players: number,
  notes: string[] = [],
  values: Record<string, string> = {},
): Campaign {
  const campaign = afterThePallidMask(players, notes, values)
  return {
    ...campaign,
    scenarioIndex: 7,
    results: [
      ...campaign.results,
      { scenario: 'black-stars-rise', outcome: { type: 'resolution', resolution: 1 }, xp: {} },
    ],
  }
}

const VARIANTS: [string[], Record<string, string>][] = [
  [['carcosaOpenedThePathBelow'], {}],
  [['carcosaOpenedThePathAbove'], { carcosaDoubt: '4', carcosaConviction: '3' }],
  [['carcosaOpenedThePathBelow'], { carcosaDoubt: '2', carcosaConviction: '5' }],
  [['carcosaOpenedThePathAbove'], { carcosaDoubt: '3', carcosaConviction: '3' }],
]

describe('Dim Carcosa: complete games with random inputs', () => {
  it.each([1, 2, 3, 4])('%i investigator(s): 10 games reach a resolution', (players) => {
    for (let n = 0; n < 10; n++) {
      const [notes, values] = VARIANTS[n % VARIANTS.length]!
      const campaign = afterBlackStars(players, notes, values)
      const state: GameState = playRandom(campaign, 2900 + n * 7 + players)
      expect(state.scenarioId).toBe(DIM_CARCOSA)
      expect(state.outcome, `seed ${n}`).not.toBeNull()
      const next = finishScenario(campaign, state)
      expect(next.scenarioIndex).toBe(8)
    }
  })
})
