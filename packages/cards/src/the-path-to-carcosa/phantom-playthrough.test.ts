import type { GameState } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { finishScenario, type Campaign } from '../campaign'
import '../index'
import { A_PHANTOM_OF_TRUTH } from './a-phantom-of-truth'
import { playRandom } from './echoes-playthrough.test'
import { afterEchoes } from './oath-playthrough.test'

/** Campaña tras El juramento inconfesable (R3), con notas y marcas opcionales. */
export function afterTheOath(
  players: number,
  notes: string[] = [],
  values: Record<string, string> = {},
): Campaign {
  const campaign = afterEchoes(players, notes)
  return {
    ...campaign,
    scenarioIndex: 4,
    results: [
      ...campaign.results,
      { scenario: 'the-unspeakable-oath', outcome: { type: 'resolution', resolution: 3 }, xp: {} },
    ],
    log: { ...campaign.log, values: { ...campaign.log.values, ...values } },
  }
}

const VARIANTS: [string[], Record<string, string>][] = [
  [[], {}],
  [['carcosaConviction', 'carcosaInterviewedJordan'], { carcosaConviction: '2' }],
  [['carcosaPoliceSuspicious', 'carcosaSlewTheMonsters'], { carcosaChasingTheStranger: '4' }],
  [['carcosaKingClaimedItsVictims', 'carcosaSecretMeeting'], { carcosaDoubt: '1' }],
]

describe('A Phantom of Truth: complete games with random inputs', () => {
  it.each([1, 2, 3, 4])('%i investigator(s): 10 games reach a resolution', (players) => {
    for (let n = 0; n < 10; n++) {
      const [notes, values] = VARIANTS[n % VARIANTS.length]!
      const campaign = afterTheOath(players, notes, values)
      const state: GameState = playRandom(campaign, 1200 + n * 7 + players)
      expect(state.scenarioId).toBe(A_PHANTOM_OF_TRUTH)
      expect(state.outcome, `seed ${n}`).not.toBeNull()
      const next = finishScenario(campaign, state)
      expect(next.scenarioIndex).toBe(5)
    }
  })
})
