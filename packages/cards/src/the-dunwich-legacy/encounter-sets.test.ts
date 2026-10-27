import {
  createGame,
  getInvestigator,
  skillTestValue,
  type GameState,
  type Message,
  type SkillType,
} from '@lcg/engine'
import {
  choose,
  during,
  keep,
  spawnAt,
  testInvestigator,
  testScenario,
  throughSetup,
} from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { DUNWICH_ENCOUNTER_SETS, DUNWICH_SETS, whippoorwill } from './encounter-sets'

function game(players = 1): GameState {
  let s = throughSetup(
    createGame({
      seed: 1,
      interactive: true,
      scenario: testScenario({ chaosBag: [0] }),
      investigators: ['a', 'b']
        .slice(0, players)
        .map((id) => testInvestigator(id, { health: 30, sanity: 30 })),
    }),
  )
  if (s.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    s = choose(s, 'choice.investigator')
  return s
}
const change =
  (id: string, changes: Partial<GameState['investigators'][number]>) =>
  (s: GameState): GameState => ({
    ...s,
    investigators: s.investigators.map((i) => (i.id === id ? { ...i, ...changes } : i)),
  })
const draw = (code: string, investigator = 'a'): Message => ({
  type: 'ResolveEncounterCard',
  investigator,
  card: {
    ...Object.values(DUNWICH_ENCOUNTER_SETS)
      .flat()
      .find((c) => c.code === code)!,
  },
})
const resolveTest = (s: GameState) => choose(choose(s, 'choice.revealToken'), 'choice.applyResults')

// Card texts 02083–02084 and 02090–02091; RR: Revelation, Forced Abilities, Surge, Skill Tests.
describe('Dunwich shared encounters', () => {
  it('keeps the original set quantities and independent card copies', () => {
    expect(DUNWICH_ENCOUNTER_SETS.sorcery.map((c) => c.code)).toEqual([
      '02083',
      '02083',
      '02083',
      '02084',
      '02084',
      '02084',
    ])
    expect(DUNWICH_ENCOUNTER_SETS.whippoorwills.map((c) => c.code)).toEqual([
      '02090',
      '02090',
      '02090',
      '02091',
      '02091',
    ])
    expect(DUNWICH_ENCOUNTER_SETS.sorcery[0]).not.toBe(DUNWICH_ENCOUNTER_SETS.sorcery[1])
  })

  it('Visions of Futures Past mills one card per point of failure without drawing or reshuffling', () => {
    const initial = game()
    const before = getInvestigator(initial, 'a')
    const s = resolveTest(during(initial, keep, draw(DUNWICH_SETS.visionsOfFuturesPast)))
    expect(getInvestigator(s, 'a').deck).toEqual(before.deck.slice(2))
    expect(getInvestigator(s, 'a').discard).toEqual([...before.discard, ...before.deck.slice(0, 2)])
    expect(getInvestigator(s, 'a').hand).toEqual(before.hand)
    const short = resolveTest(
      during(
        game(),
        change('a', { deck: ['last'], discard: ['old'] }),
        draw(DUNWICH_SETS.visionsOfFuturesPast),
      ),
    )
    expect(getInvestigator(short, 'a')).toMatchObject({
      deck: [],
      discard: ['old', 'last'],
      horror: 0,
    })
  })

  it('Visions of Futures Past does not mill after a successful test', () => {
    const initial = game()
    const s = resolveTest(
      during(initial, (s) => ({ ...s, chaosBag: [2] }), draw(DUNWICH_SETS.visionsOfFuturesPast)),
    )
    expect(getInvestigator(s, 'a').deck).toEqual(getInvestigator(initial, 'a').deck)
  })

  it.each(['draw', 'discard', 'search'] as const)(
    'Beyond the Veil deals ten damage immediately when the last card leaves by %s',
    (method) => {
      let s = during(
        game(),
        change('a', { deck: ['last'], discard: ['old'] }),
        draw(DUNWICH_SETS.beyondTheVeil),
      )
      const message: Message =
        method === 'draw'
          ? { type: 'DrawCards', investigator: 'a', amount: 1 }
          : method === 'discard'
            ? { type: 'MillDeck', investigator: 'a', amount: 3 }
            : { type: 'TakeFromDeck', investigator: 'a', code: 'last', to: 'hand' }
      s = during(s, keep, message)
      expect(getInvestigator(s, 'a').damage).toBe(10)
      expect(getInvestigator(s, 'a').deck).toEqual([])
      expect(Object.values(s.treacheries).some((t) => t.code === DUNWICH_SETS.beyondTheVeil)).toBe(
        false,
      )
      s = during(s, keep, { type: 'DrawCards', investigator: 'a', amount: 1 })
      expect(getInvestigator(s, 'a').damage).toBe(10)
      expect(getInvestigator(s, 'a').horror).toBe(1)
    },
  )

  it('Beyond the Veil triggers on revelation with an already empty deck', () => {
    const s = during(game(), change('a', { deck: [] }), draw(DUNWICH_SETS.beyondTheVeil))
    expect(getInvestigator(s, 'a').damage).toBe(10)
    expect(Object.values(s.treacheries)).toHaveLength(0)
  })

  it('Beyond the Veil keeps one copy per investigator, still surges on duplicates, and does not harm another owner', () => {
    let s = during(
      game(2),
      keep,
      draw(DUNWICH_SETS.beyondTheVeil),
      draw(DUNWICH_SETS.beyondTheVeil),
      draw(DUNWICH_SETS.beyondTheVeil, 'b'),
    )
    expect(
      Object.values(s.treacheries).filter((t) => t.code === DUNWICH_SETS.beyondTheVeil),
    ).toHaveLength(2)
    // Each revelation, including the duplicate, draws the next encounter card.
    expect(s.encounterDeck).toHaveLength(3)
    s = during(s, change('b', { deck: ['last'] }), {
      type: 'MillDeck',
      investigator: 'b',
      amount: 1,
    })
    expect(getInvestigator(s, 'a').damage).toBe(0)
    expect(getInvestigator(s, 'b').damage).toBe(10)
    expect(
      Object.values(s.treacheries).filter((t) => t.code === DUNWICH_SETS.beyondTheVeil),
    ).toHaveLength(1)
  })

  it('Visions of Futures Past triggers Beyond the Veil during its discard effect', () => {
    let s = during(game(), change('a', { deck: ['last'] }), draw(DUNWICH_SETS.beyondTheVeil))
    s = resolveTest(during(s, keep, draw(DUNWICH_SETS.visionsOfFuturesPast)))
    expect(getInvestigator(s, 'a')).toMatchObject({ damage: 10, deck: [], horror: 0 })
  })

  it.each(['willpower', 'intellect', 'combat', 'agility'] as SkillType[])(
    'Whippoorwill stacks its %s penalty only at its location',
    (skill) => {
      let s = during(
        game(),
        keep,
        spawnAt('A', whippoorwill),
        spawnAt('B', whippoorwill),
        spawnAt('A', whippoorwill),
      )
      s = during(s, keep, {
        type: 'BeginSkillTest',
        investigator: 'a',
        skill,
        difficulty: 3,
        kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
      })
      expect(skillTestValue(s).passive).toBe(-2)
      expect(whippoorwill.keywords).toEqual(['aloof', 'hunter'])
      expect(whippoorwill).toMatchObject({ health: 1, fight: 2, evade: 4, damage: 0, horror: 1 })
    },
  )

  it.each([0, 2])(
    'Eager for Death adds current damage (%i) to difficulty and deals horror only on failure',
    (damage) => {
      let s = during(game(), change('a', { damage }), draw(DUNWICH_SETS.eagerForDeath))
      expect(s.skillTest?.difficulty).toBe(2 + damage)
      s = resolveTest(s)
      expect(getInvestigator(s, 'a').horror).toBe(damage ? 2 : 0)
      expect(getInvestigator(s, 'a').damage).toBe(damage)
    },
  )
})
