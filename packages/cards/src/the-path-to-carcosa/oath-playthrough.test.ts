import type { GameState } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { finishScenario, type Campaign } from '../campaign'
import '../index'
import { CLASP_OF_BLACK_ONYX } from './echoes-assets'
import { afterTheLastKing, playRandom } from './echoes-playthrough.test'
import { THE_UNSPEAKABLE_OATH } from './the-unspeakable-oath'

/** Campaña tras Ecos del pasado; con el broche, el segundo investigador lo lleva. */
export function afterEchoes(players: number, notes: string[] = []): Campaign {
  const campaign = afterTheLastKing(players, notes)
  const result = {
    scenario: 'echoes-of-the-past',
    outcome: { type: 'resolution' as const, resolution: 1 },
    xp: {},
  }
  const bearer = campaign.investigators[players > 1 ? 1 : 0]!.id
  const clasp = notes.includes('carcosaTookTheOnyxClasp')
  return {
    ...campaign,
    scenarioIndex: 3,
    results: [...campaign.results, result],
    log: {
      ...campaign.log,
      investigators: clasp
        ? {
            ...campaign.log.investigators,
            [bearer]: {
              ...campaign.log.investigators[bearer]!,
              storyAssets: [
                ...campaign.log.investigators[bearer]!.storyAssets,
                CLASP_OF_BLACK_ONYX,
              ],
            },
          }
        : campaign.log.investigators,
    },
  }
}

const NOTES = [
  [],
  ['carcosaTookTheOnyxClasp', 'carcosaInterviewedConstance'],
  ['carcosaFollowersFoundTheWay', 'carcosaSlainConstance'],
  ['carcosaTookTheOnyxClasp'],
]

describe('The Unspeakable Oath: complete games with random inputs', () => {
  it.each([1, 2, 3, 4])('%i investigator(s): 10 games reach a resolution', (players) => {
    for (let n = 0; n < 10; n++) {
      const campaign = afterEchoes(players, NOTES[n % NOTES.length])
      const state: GameState = playRandom(campaign, 900 + n * 7 + players)
      expect(state.scenarioId).toBe(THE_UNSPEAKABLE_OATH)
      expect(state.outcome, `seed ${n}`).not.toBeNull()
      const next = finishScenario(campaign, state)
      expect(next.scenarioIndex).toBe(4)
      expect(next.log.chaosTokens.length).toBeGreaterThanOrEqual(3)
    }
  })
})
