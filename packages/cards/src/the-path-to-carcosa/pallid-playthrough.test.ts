import type { GameState } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { finishScenario, type Campaign } from '../campaign'
import '../index'
import { playRandom } from './echoes-playthrough.test'
import { afterTheOath } from './phantom-playthrough.test'
import { THE_PALLID_MASK } from './the-pallid-mask'

/** Campaña tras El Fantasma de la Verdad, con notas y marcas opcionales. */
export function afterThePhantom(
  players: number,
  notes: string[] = [],
  values: Record<string, string> = {},
): Campaign {
  const campaign = afterTheOath(players, notes, values)
  return {
    ...campaign,
    scenarioIndex: 5,
    results: [
      ...campaign.results,
      { scenario: 'a-phantom-of-truth', outcome: { type: 'resolution', resolution: 1 }, xp: {} },
    ],
  }
}

const VARIANTS: string[][] = [
  ['carcosaFoundNigelsHome'],
  ['carcosaGazeOfThePhantom', 'carcosaInterviewedHaruko'],
  ['carcosaUnableToFindNigel'],
  ['carcosaFoundNigelEngram', 'carcosaInterviewedHaruko', 'carcosaSlainHaruko'],
]

describe('The Pallid Mask: complete games with random inputs', () => {
  it.each([1, 2, 3, 4])('%i investigator(s): 10 games reach a resolution', (players) => {
    for (let n = 0; n < 10; n++) {
      const campaign = afterThePhantom(players, VARIANTS[n % VARIANTS.length])
      const state: GameState = playRandom(campaign, 1500 + n * 7 + players)
      expect(state.scenarioId).toBe(THE_PALLID_MASK)
      expect(state.outcome, `seed ${n}`).not.toBeNull()
      const next = finishScenario(campaign, state)
      expect(next.scenarioIndex).toBe(6)
    }
  })
})
