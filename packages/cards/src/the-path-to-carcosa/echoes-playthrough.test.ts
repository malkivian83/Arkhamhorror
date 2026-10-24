import { applyInput, nextInt, seedRng, type GameState, type RngState } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { finishScenario, newCampaign, startScenario, type Campaign } from '../campaign'
import '../index'
import { ECHOES_OF_THE_PAST } from './echoes-of-the-past'
import { THE_MAN_IN_THE_PALLID_MASK } from './the-man-in-the-pallid-mask'

const KEYS = ['joe', 'trish', 'isabelle', 'dexter'] as const

/** Campaña tras El Último Rey: el jefe lleva al Extranjero; notas del registro opcionales. */
export function afterTheLastKing(players: number, notes: string[] = []): Campaign {
  const campaign = newCampaign('the-path-to-carcosa', KEYS.slice(0, players), 'easy')
  const lead = campaign.investigators[0]!.id
  const result = (scenario: string) => ({
    scenario,
    outcome: { type: 'resolution' as const, resolution: 1 },
    xp: {},
  })
  return {
    ...campaign,
    scenarioIndex: 2,
    results: [result('curtain-call'), result('the-last-king')],
    log: {
      ...campaign.log,
      notes: ['carcosaStrangerIsOnToYou', ...notes],
      investigators: {
        ...campaign.log.investigators,
        [lead]: {
          ...campaign.log.investigators[lead]!,
          storyAssets: [THE_MAN_IN_THE_PALLID_MASK],
        },
      },
    },
  }
}

/** Partida con decisiones al azar (con semilla) hasta que termina. */
export function playRandom(campaign: Campaign, seed: number) {
  let state = startScenario(campaign, seed)
  let rng: RngState = seedRng(seed)
  for (let n = 0; n < 5000 && !state.outcome; n++) {
    const { choices } = state.pending!.question
    let choice: number
    ;[choice, rng] = nextInt(rng, choices.length)
    state = applyInput(state, { investigator: state.pending!.investigator, choice })
  }
  return state
}

describe('Echoes of the Past: complete games with random inputs', () => {
  it.each([1, 2, 3, 4])('%i investigator(s): 10 games reach a resolution', (players) => {
    for (let n = 0; n < 10; n++) {
      const campaign = afterTheLastKing(players, n % 2 ? ['carcosaInterviewedSebastien'] : [])
      const state: GameState = playRandom(campaign, 700 + n * 7 + players)
      expect(state.scenarioId).toBe(ECHOES_OF_THE_PAST)
      expect(state.outcome, `seed ${n}`).not.toBeNull()
      const next = finishScenario(campaign, state)
      expect(next.scenarioIndex).toBe(3)
      expect(next.log.chaosTokens.length).toBeGreaterThanOrEqual(2)
    }
  })
})
