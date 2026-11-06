import {
  availableAbilities,
  dispatch,
  emptyCampaignLog,
  registerScenario,
  type ChaosToken,
  type GameState,
} from '@lcg/engine'
import { choose, newTestGame } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { effectTest } from '../scenario-helpers'
import { mirageDecks } from './fatal-mirage-decks'
import { fatalMirageExploration } from './fatal-mirage-exploration'
import { prepareMirageMap, PRISON_OF_MEMORIES, readMirageMemories } from './fatal-mirage-map'
import { horrifyingShade } from './fatal-mirage-shade'

registerScenario(fatalMirageExploration)

function duringMirage(visit: 1 | 2 | 3) {
  const state = newTestGame({
    scenario: {
      ...prepareMirageMap(visit, new Set(['08557', '08566']), new Set()),
      ...mirageDecks(visit),
      id: fatalMirageExploration.id,
      startingLocation: PRISON_OF_MEMORIES,
    },
  })
  return {
    ...state,
    queue: [],
    pending: null,
    campaignLog: emptyCampaignLog(['a']),
    tekeliliDeck: ['08723', '08724'],
  }
}

describe('Fatal Mirage plans and acts', () => {
  it.each([
    { visit: 1 as const, doom: 15, weaknesses: 1, trauma: 0 },
    { visit: 2 as const, doom: 13, weaknesses: 2, trauma: 0 },
    { visit: 3 as const, doom: 11, weaknesses: 0, trauma: 1 },
  ])(
    'applies the defeat penalty for visit $visit at its doom threshold',
    ({ visit, doom, weaknesses, trauma }) => {
      // RR: "Agenda Deck and Act Deck", advancing the agenda.
      const state = duringMirage(visit)
      expect(state.agendas).toHaveLength(1)
      expect(state.agendas[0]?.doomThreshold).toBe(doom)
      expect(state.acts).toHaveLength(1)
      const finished = dispatch({ ...state, doom }, { type: 'CheckAgenda' })
      expect(finished.investigators[0]?.eliminated).toBe(true)
      expect(finished.outcome).toEqual({ type: 'noResolution' })
      expect(finished.campaignLog?.investigators.a?.storyAssets).toHaveLength(weaknesses)
      expect(finished.campaignLog?.investigators.a?.mentalTrauma).toBe(trauma)
    },
  )

  it('pays one horror to return to the Prison without spending an action', () => {
    // RR: "Costs" and "Free Triggered Abilities".
    const state = duringMirage(2)
    expect(availableAbilities(state, 'a').some(({ key }) => key.endsWith(':returnToPrison'))).toBe(
      false,
    )
    const away = dispatch(state, { type: 'MoveTo', investigator: 'a', location: '08566' })
    const ability = availableAbilities(away, 'a').find(({ key }) => key === '08551:returnToPrison')!
    expect(ability.actions).toBe(0)
    const returned = dispatch(away, { ...ability, type: 'UseAbility', investigator: 'a' })
    expect(returned.investigators[0]).toMatchObject({ horror: 1, location: PRISON_OF_MEMORIES })
  })

  it('records the discoveries and grants XP only for newly banished stories on act advance', () => {
    // Guide, p. 26: score the story cards newly recorded as banished.
    const state = duringMirage(2)
    const advanced = dispatch(
      {
        ...state,
        campaignLog: {
          ...state.campaignLog,
          values: { edgeOfTheEarthBanishedMemories: '08577b' },
        },
        victoryDisplay: ['08577b', '08566b'],
        victoryPoints: 1,
      },
      { type: 'AdvanceAct' },
    )
    expect(advanced.outcome).toEqual({ type: 'resolution', resolution: 1 })
    expect(advanced.campaignLog?.investigators.a?.xp).toBe(3)
    expect(readMirageMemories(advanced.campaignLog!)).toEqual({
      discovered: new Set(['08557']),
      banished: new Set(['08566b', '08577b']),
    })
  })
})

describe('Fatal Mirage chaos reference', () => {
  function reveal(state: GameState, token: ChaosToken, difficulty: number) {
    return dispatch(
      { ...state, chaosBag: [token] },
      effectTest('a', 'mirage-test', 'willpower', difficulty, {}),
    )
  }

  it('counts story cards and adds the plan number on hard', () => {
    // RR: "Skill Tests", ST.4. Non-story cards in the victory display do not count.
    const state = { ...duringMirage(2), victoryDisplay: ['08577b', '08566b', '08584'] }
    expect(fatalMirageExploration.tokenEffect!(state, 'skull', 'a').modifier).toBe(-2)
    expect(
      fatalMirageExploration.tokenEffect!({ ...state, difficulty: 'hard' }, 'skull', 'a').modifier,
    ).toBe(-4)
  })

  it('only drops a clue on a failed standard test or a hard test passed by less than two', () => {
    const state = duringMirage(2)
    state.investigators[0]!.clues = 2
    expect(reveal(state, 'cultist', 1).investigators[0]?.clues).toBe(2)
    expect(reveal(state, 'cultist', 2).investigators[0]?.clues).toBe(1)
    expect(reveal({ ...state, difficulty: 'hard' }, 'cultist', 1).investigators[0]?.clues).toBe(1)
  })

  it('offers the tablet choice and resolves both consequences on a hard failure by two', () => {
    const away = dispatch(duringMirage(2), { type: 'MoveTo', investigator: 'a', location: '08566' })
    const chooseEffect = reveal(away, 'tablet', 1)
    const moved = choose(chooseEffect, 'choice.edgeOfTheEarth.mirageMoveToPrison')
    expect(moved.investigators[0]?.location).toBe(PRISON_OF_MEMORIES)
    expect(moved.tekeliliDeck).toHaveLength(2)
    const both = reveal({ ...away, difficulty: 'hard' }, 'tablet', 2)
    expect(both.investigators[0]?.location).toBe(PRISON_OF_MEMORIES)
    expect(both.tekeliliDeck).toEqual(['08724'])
  })

  it('places doom on an Eidolon after a failed elder thing test', () => {
    const state = dispatch(duringMirage(2), {
      type: 'SpawnEnemy',
      card: horrifyingShade,
      location: PRISON_OF_MEMORIES,
      engageWith: null,
    })
    const failed = reveal(state, 'elderThing', 1)
    expect(Object.values(failed.enemies)[0]?.doom).toBe(1)
    expect(failed.doom).toBe(0)
  })
})
