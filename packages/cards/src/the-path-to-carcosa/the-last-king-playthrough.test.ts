import { applyInput, nextInt, seedRng, type GameState, type RngState } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { finishScenario, newCampaign, startScenario, type Campaign } from '../campaign'
import '../index'
import { carcosaCount } from './log'
import { THE_LAST_KING } from './the-last-king'
import { THE_MAN_IN_THE_PALLID_MASK } from './the-man-in-the-pallid-mask'

const KEYS = ['joe', 'trish', 'isabelle', 'dexter'] as const

/** Campaña tras Se cierra el telón (R1): el jefe lleva al Extranjero en su mazo. */
export function afterCurtainCall(players: number, difficulty = 'easy' as const): Campaign {
  const campaign = newCampaign('the-path-to-carcosa', KEYS.slice(0, players), difficulty)
  const lead = campaign.investigators[0]!.id
  return {
    ...campaign,
    scenarioIndex: 1,
    log: {
      ...campaign.log,
      notes: ['carcosaStrangerIsOnToYou'],
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
  for (let n = 0; n < 4000 && !state.outcome; n++) {
    const { choices } = state.pending!.question
    // Prefiere no pasar turno: así la partida avanza y se usan habilidades.
    let choice: number
    ;[choice, rng] = nextInt(rng, choices.length)
    state = applyInput(state, { investigator: state.pending!.investigator, choice })
  }
  return state
}

describe('The Last King: complete games with random inputs', () => {
  it.each([1, 2, 3, 4])('%i investigator(s): 10 games reach a resolution', (players) => {
    for (let n = 0; n < 10; n++) {
      const campaign = afterCurtainCall(players)
      const state: GameState = playRandom(campaign, 500 + n * 7 + players)
      expect(state.scenarioId).toBe(THE_LAST_KING)
      expect(state.outcome, `seed ${n}`).not.toBeNull()
      const next = finishScenario(campaign, state)
      expect(next.scenarioIndex).toBe(2)
      // Las fichas de sectario, tablilla y primigenio siempre se sustituyen.
      const symbols = next.log.chaosTokens.filter((t) =>
        ['cultist', 'tablet', 'elderThing'].includes(String(t)),
      )
      expect(symbols.length).toBeGreaterThanOrEqual(2)
      expect(carcosaCount(next.log, 'doubt') + carcosaCount(next.log, 'conviction')).toBeLessThan(2)
    }
  })
})
