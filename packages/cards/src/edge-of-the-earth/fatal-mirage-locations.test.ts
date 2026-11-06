import {
  availableAbilities,
  dispatch,
  enemyHasKeyword,
  nextInt,
  registerScenario,
  shroudOf,
  type GameState,
} from '@lcg/engine'
import { choose, ghoul, newTestGame } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { fatalMirageExploration } from './fatal-mirage-exploration'
import { prepareMirageMap, PRISON_OF_MEMORIES } from './fatal-mirage-map'
import { evanescentMist } from './fatal-mirage-mist'
import { registerTekelili } from './tekelili'

registerScenario(fatalMirageExploration)
registerTekelili()

function at(location: string, partner?: '08722'): GameState {
  const state = newTestGame({
    players: ['a', 'b'],
    scenario: {
      ...prepareMirageMap(2, new Set([location]), new Set()),
      id: fatalMirageExploration.id,
      startingLocation: PRISON_OF_MEMORIES,
    },
  })
  return {
    ...state,
    queue: [],
    pending: null,
    activeTurn: 'a',
    tekeliliDeck: ['08723'],
    locations: {
      ...state.locations,
      [location]: {
        ...state.locations[location]!,
        revealed: true,
        clues: state.locations[location]!.clueValue * 2,
      },
    },
    investigators: state.investigators.map((i) => ({
      ...i,
      location,
      actionsRemaining: 3,
      horror: 1,
    })),
    ...(partner
      ? {
          assets: {
            companion: {
              id: 'companion',
              code: '08595',
              owner: 'b',
              expeditionPartner: partner,
              exhausted: false,
              damage: 0,
              horror: 0,
              uses: 0,
            },
          },
        }
      : {}),
  }
}

const move = (state: GameState, location: string, investigator = 'a') =>
  dispatch(state, { type: 'MoveTo', investigator, location })

function investigate(state: GameState, location: string, difficulty: number) {
  return dispatch(state, {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'intellect',
    difficulty,
    kind: { type: 'investigate', location },
  })
}

describe('Fatal Mirage printed location rules', () => {
  it('mills three cards per investigator who spends one clue at University Halls', () => {
    const state = at('08559')
    const prepared = {
      ...state,
      investigators: state.investigators.map((i) => ({ ...i, clues: 1 })),
    }
    const ability = availableAbilities(prepared, 'a').find(({ key }) => key === '08559:mirage')!
    const explored = dispatch(prepared, { ...ability, type: 'UseAbility', investigator: 'a' })
    for (const [index, investigator] of explored.investigators.entries()) {
      expect(investigator.discard).toEqual(prepared.investigators[index]!.deck.slice(0, 3))
      expect(investigator.deck).toEqual(prepared.investigators[index]!.deck.slice(3))
    }
    expect(explored.pending?.question.choices.length).toBeGreaterThan(0)
  })

  it('doubles Tekeli-li and discovers a clue at Riverview Theatre', () => {
    const start = at('08564')
    const received = dispatch(start, {
      type: 'ShuffleTekeliliIntoDeck',
      investigator: 'a',
      amount: 1,
      drawInstead: true,
    })
    expect(received.investigators[0]).toMatchObject({ horror: 3, clues: 1 })
    expect(received.tekeliliDeck).toEqual(['08723'])
  })

  it('shuffles a resolved Tekeli-li weakness back into the deck in the Dormitory', () => {
    const start = at('08568')
    const received = dispatch(start, {
      type: 'ShuffleTekeliliIntoDeck',
      investigator: 'a',
      amount: 1,
      drawInstead: true,
    })
    expect(received.investigators[0]?.deck).toContain('08723')
    expect(received.tekeliliDeck).toEqual([])
    expect(received.campaignLog?.investigators.a?.storyAssets).toContain('08723')
  })
  it('charges a resource at the Airfield before resolving the test', () => {
    const state = at('08566')
    const resolved = investigate(state, '08566', 1)
    expect(resolved.investigators[0]?.resources).toBe(state.investigators[0]!.resources - 1)
    expect(resolved.investigators[0]?.clues).toBe(1)
    const broke = {
      ...state,
      investigators: state.investigators.map((i) => ({ ...i, resources: 0 })),
    }
    expect(investigate(broke, '08566', 1).investigators[0]?.clues).toBe(0)
  })

  it('offers a harder investigation or an additional action on the Theodosia', () => {
    const offered = investigate(at('08558'), '08558', 2)
    const harder = choose(offered, 'choice.edgeOfTheEarth.mirageExtraShroud')
    expect(harder.investigators[0]).toMatchObject({ actionsRemaining: 3, clues: 0 })
    const paid = choose(offered, 'choice.edgeOfTheEarth.mirageExtraAction')
    expect(paid.investigators[0]).toMatchObject({ actionsRemaining: 2, clues: 1 })
  })
  it('pays to enter Alaskan Wilds even with the last action or last weakness', () => {
    const outside = move(at('08567'), PRISON_OF_MEMORIES)
    const paying = move(outside, '08567')
    const weakness = choose(paying, 'choice.edgeOfTheEarth.mirageShuffleTekelili')
    expect(weakness.investigators[0]?.location).toBe('08567')
    expect(weakness.tekeliliDeck).toEqual([])
    const oneAction = {
      ...outside,
      tekeliliDeck: [],
      investigators: outside.investigators.map((i) => ({ ...i, actionsRemaining: 1 })),
    }
    const spent = move(oneAction, '08567')
    expect(spent.investigators[0]).toMatchObject({ location: '08567', actionsRemaining: 0 })
  })
  it('lets Base Camp turn a failure by one into success at the cost of horror', () => {
    // RR: "Skill Tests", ST.6.
    const state = at('08557')
    const offered = investigate(state, '08557', 4)
    const fixed = choose(offered, 'choice.edgeOfTheEarth.mirageCampRetry')
    expect(fixed.investigators[0]).toMatchObject({ clues: 1, horror: 2 })
  })

  it('raises the Hedge Maze shroud and prevents leaving after investigating', () => {
    const investigated = investigate(at('08560'), '08560', 5)
    expect(shroudOf(investigated, '08560')).toBe(3)
    expect(move(investigated, PRISON_OF_MEMORIES).investigators[0]?.location).toBe('08560')
    expect(
      move({ ...investigated, activeTurn: null }, PRISON_OF_MEMORIES).investigators[0]?.location,
    ).toBe(PRISON_OF_MEMORIES)
  })

  it.each([
    ['08562', 0, 2],
    ['08565', 1, 1],
  ] as const)(
    'adds a clue on a successful frost investigation at %s',
    (location, damage, horror) => {
      const start = at(location)
      const state = {
        ...start,
        chaosBag: nextInt(start.rng, 2)[0] === 0 ? ['frost', 1] : [1, 'frost'],
      } satisfies GameState
      const investigated = investigate(state, location, 1)
      expect(investigated.investigators[0]).toMatchObject({ clues: 2, damage, horror })
    },
  )

  it('charges horror in Kensler’s office when no secret can be removed', () => {
    const investigated = investigate(at('08571'), '08571', 1)
    expect(investigated.investigators[0]).toMatchObject({ clues: 1, horror: 2 })
  })

  it('grants surge for the first treachery attached at Mo’ai Statues each phase', () => {
    const state = at('08572')
    const placed = dispatch(
      { ...state, encounterDeck: [evanescentMist, ghoul] },
      {
        type: 'DrawEncounterCard',
        investigator: 'a',
      },
    )
    expect(placed.scenarioMeta?.mirageMoaiSurge).toBe(`${state.round}:${state.phase}`)
    expect(placed.encounterDeck).toEqual([])
    const again = dispatch(placed, {
      type: 'Forced',
      trigger: {
        type: 'treacheryAttached',
        treachery: 'mist2',
        location: '08572',
      },
    })
    expect(again.encounterDeck).toEqual(placed.encounterDeck)
  })
  it('adjusts shroud for a Resolute companion and for an attached treachery', () => {
    // RR: "Investigate Action".
    const airfield = at('08566', '08722')
    expect(shroudOf(airfield, '08566')).toBe(2)
    expect(shroudOf(move(airfield, PRISON_OF_MEMORIES, 'b'), '08566')).toBe(4)
    const station = at('08561')
    expect(
      shroudOf(
        {
          ...station,
          treacheries: {
            mist: {
              ...evanescentMist,
              id: 'mist',
              owner: 'a',
              placement: { type: 'location', location: '08561' },
            },
          },
        },
        '08561',
      ),
    ).toBe(6)
  })

  it('shuffles a weakness when the Elder Chamber yields at least two clues', () => {
    const state = at('08563')
    const single = dispatch(state, { type: 'DiscoverClues', investigator: 'a', amount: 1 })
    expect(single.tekeliliDeck).toEqual(['08723'])
    const multiple = dispatch(state, { type: 'DiscoverClues', investigator: 'a', amount: 2 })
    expect(multiple.tekeliliDeck).toEqual([])
    expect(multiple.investigators[0]?.deck).toContain('08723')
  })

  it('heals one horror in Dyer’s classroom at the cost of a weakness', () => {
    const state = move(at('08569'), PRISON_OF_MEMORIES, 'b')
    const ability = availableAbilities(state, 'a').find(({ key }) => key === '08569:heal')!
    const healed = dispatch(state, { ...ability, type: 'UseAbility', investigator: 'a' })
    expect(healed.investigators[0]?.horror).toBe(0)
    expect(healed.investigators[0]?.deck).toContain('08723')
  })

  it('damages each investigator only on their first entry to the Infirmary', () => {
    const starting = at('08570')
    const first = move(move(starting, PRISON_OF_MEMORIES), '08570')
    expect(first.investigators[0]?.damage).toBe(2)
    const second = move(move(first, PRISON_OF_MEMORIES), '08570')
    expect(second.investigators[0]?.damage).toBe(2)
  })

  it('strengthens only non-Elite enemies at Ottoman Front', () => {
    const state = at('08573')
    const spawned = dispatch(state, {
      type: 'SpawnEnemy',
      card: { ...ghoul, keywords: ['retaliate'] },
      location: '08573',
      engageWith: null,
    })
    const foe = Object.values(spawned.enemies)[0]!
    expect(fatalMirageExploration.enemyStat?.(spawned, foe, 'fight')).toBe(2)
    expect(enemyHasKeyword(spawned, foe, 'retaliate')).toBe(false)
    const elite = { ...foe, traits: ['Elite'] }
    expect(fatalMirageExploration.enemyStat?.(spawned, elite, 'fight')).toBe(0)
    expect(enemyHasKeyword(spawned, elite, 'retaliate')).toBe(true)
  })

  it('enforces the group limit on the Black Stone’s frost ability', () => {
    const state = at('08574')
    const ability = availableAbilities(state, 'a').find(({ key }) => key === '08574:frostClues')!
    const used = dispatch(state, { ...ability, type: 'UseAbility', investigator: 'a' })
    expect(used.investigators[0]?.clues).toBe(2)
    expect(used.chaosBag).toContain('frost')
    expect(availableAbilities(used, 'b').some(({ key }) => key === ability.key)).toBe(false)
  })
})
