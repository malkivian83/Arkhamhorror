import {
  createGame,
  getInvestigator,
  registerPlayerCard,
  registerPlayerCards,
  registerScenario,
  type GameState,
  type Message,
} from '@lcg/engine'
import {
  choose,
  during,
  keep,
  testInvestigator,
  testScenario,
  throughSetup,
} from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { THE_BEYOND, THE_BEYOND_CODES as C } from './the-beyond'
import { DUNWICH_SETS, DUNWICH_ENCOUNTER_SETS } from './encounter-sets'

const ASSET = 'beyond-test-asset'
const EVENT = 'beyond-test-event'
const SKILL = 'beyond-test-skill'
const WEAKNESS = 'beyond-test-weakness'
const STORY = 'beyond-test-story'
const PERMANENT = 'beyond-test-permanent'
registerPlayerCards([
  { code: ASSET, name: 'Test Asset', type: 'asset', class: 'neutral', traits: [], cost: 0 },
  { code: EVENT, name: 'Test Event', type: 'event', class: 'neutral', traits: [], cost: 0 },
  { code: SKILL, name: 'Test Skill', type: 'skill', class: 'neutral', traits: [] },
  {
    code: WEAKNESS,
    name: 'Test Weakness',
    type: 'asset',
    class: 'neutral',
    traits: [],
    weakness: 'basicweakness',
  },
  {
    code: STORY,
    name: 'Test Story',
    type: 'asset',
    class: 'neutral',
    traits: ['Story'],
    story: true,
  },
  { code: PERMANENT, name: 'Test Permanent', type: 'asset', class: 'neutral', traits: [] },
])
registerPlayerCard({ code: PERMANENT, permanent: {} })
registerScenario({
  id: 'beyond-test',
  forced: (state, trigger) =>
    state.scenarioMeta?.cancelTerror && trigger.type === 'whenTreacheryDrawn'
      ? [{ type: 'CancelRevelation', treachery: trigger.treachery }]
      : [],
})

function game(players = 1): GameState {
  let s = throughSetup(
    createGame({
      seed: 7,
      interactive: true,
      scenario: testScenario({ id: 'beyond-test', chaosBag: [0] }),
      investigators: ['a', 'b']
        .slice(0, players)
        .map((id) => testInvestigator(id, { health: 30, sanity: 30 })),
    }),
  )
  if (s.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    s = choose(s, 'choice.investigator')
  return s
}
const update =
  (id: string, changes: Partial<GameState['investigators'][number]>) =>
  (s: GameState): GameState => ({
    ...s,
    investigators: s.investigators.map((i) => (i.id === id ? { ...i, ...changes } : i)),
  })
const draw = (code: string, investigator = 'a'): Message => ({
  type: 'ResolveEncounterCard',
  investigator,
  card: { ...[...THE_BEYOND, ...DUNWICH_ENCOUNTER_SETS.sorcery].find((c) => c.code === code)! },
})
const put = (code = ASSET, investigator = 'a'): Message => ({
  type: 'PutAssetIntoPlay',
  code,
  investigator,
})
const resolveTest = (s: GameState) => choose(choose(s, 'choice.revealToken'), 'choice.applyResults')
const copies = (s: GameState, code: string) =>
  Object.values(s.treacheries).filter((t) => t.code === code)

// RR: Ownership and Control, Costs, Revelation, Peril, Cancel, Skill Tests.
describe('The Beyond encounter set', () => {
  it('has two copies of each original card, including peril on Terror', () => {
    expect(THE_BEYOND.map((c) => c.code)).toEqual([
      '02100',
      '02100',
      '02101',
      '02101',
      '02102',
      '02102',
    ])
    expect(THE_BEYOND.find((c) => c.code === C.terrorFromBeyond)).toMatchObject({
      keywords: ['peril'],
    })
  })

  it('Pushed into the Beyond shuffles the asset, discards three and inflicts horror if a copy is discarded', () => {
    const s = during(game(), update('a', { deck: [SKILL] }), put(), draw(C.pushedIntoTheBeyond))
    expect(Object.values(s.assets)).toHaveLength(0)
    expect(getInvestigator(s, 'a').deck).toEqual([])
    expect(getInvestigator(s, 'a').discard.sort()).toEqual([ASSET, SKILL].sort())
    expect(getInvestigator(s, 'a').horror).toBe(2)
  })

  it('Pushed excludes story and permanent assets but still discards three with no eligible asset', () => {
    const s = during(
      game(),
      update('a', { deck: [EVENT, SKILL, ASSET, EVENT] }),
      put(STORY),
      put(PERMANENT),
      draw(C.pushedIntoTheBeyond),
    )
    expect(
      Object.values(s.assets)
        .map((a) => a.code)
        .sort(),
    ).toEqual([STORY, PERMANENT].sort())
    expect(getInvestigator(s, 'a')).toMatchObject({
      deck: [EVENT],
      discard: [EVENT, SKILL, ASSET],
      horror: 0,
    })
  })

  it('Pushed lets the investigator choose among eligible assets without offering another player’s assets', () => {
    let s = during(
      game(2),
      update('a', { deck: [SKILL] }),
      put(),
      put(WEAKNESS),
      put(ASSET, 'b'),
      draw(C.pushedIntoTheBeyond),
    )
    expect(s.pending?.question.choices.map((c) => c.params?.card)).toEqual([
      'Test Asset',
      'Test Weakness',
    ])
    s = choose(s, 'choice.card', { card: 'Test Weakness' })
    expect(Object.values(s.assets).filter((a) => a.code === ASSET)).toHaveLength(2)
    expect(getInvestigator(s, 'a').discard).toContain(WEAKNESS)
    expect(getInvestigator(s, 'a').horror).toBe(2)
  })

  it('Pushed returns borrowed assets to their original owner while discarding from the drawing investigator', () => {
    let s = during(
      game(2),
      (s) => update('b', { deck: [] })(update('a', { deck: [EVENT, SKILL, EVENT, ASSET] })(s)),
      put(),
    )
    const asset = Object.values(s.assets)[0]!
    s = during(
      s,
      (s) => ({ ...s, assets: { ...s.assets, [asset.id]: { ...asset, originalOwner: 'b' } } }),
      draw(C.pushedIntoTheBeyond),
    )
    expect(getInvestigator(s, 'b').deck).toEqual([ASSET])
    expect(getInvestigator(s, 'a')).toMatchObject({
      deck: [ASSET],
      discard: [EVENT, SKILL, EVENT],
      horror: 0,
    })
  })

  it('Pushed triggers Beyond the Veil before resolving the conditional horror', () => {
    let s = during(game(), update('a', { deck: [SKILL] }), put(), draw(DUNWICH_SETS.beyondTheVeil))
    s = during(s, keep, draw(C.pushedIntoTheBeyond))
    expect(getInvestigator(s, 'a')).toMatchObject({ damage: 10, horror: 2, deck: [] })
    expect(copies(s, DUNWICH_SETS.beyondTheVeil)).toHaveLength(0)
  })

  it('Terror first copy discards the chosen type from every player, including forced weakness discards', () => {
    let s = during(
      game(2),
      (s) => ({
        ...s,
        investigators: s.investigators.map((i) => ({
          ...i,
          hand: [ASSET, ASSET, EVENT, SKILL, WEAKNESS],
        })),
      }),
      draw(C.terrorFromBeyond),
    )
    s = choose(s, 'choice.cardType.asset')
    for (const i of s.investigators) {
      expect(i.hand).toEqual([EVENT, SKILL])
      expect(i.discard).toEqual([ASSET, ASSET, WEAKNESS])
    }
  })

  it('Terror subsequent copies choose two distinct types, survive saving, and reset next phase', () => {
    let s = choose(during(game(), keep, draw(C.terrorFromBeyond)), 'choice.cardType.asset')
    s = JSON.parse(JSON.stringify(s)) as GameState
    s = during(s, update('a', { hand: [ASSET, EVENT, SKILL] }), draw(C.terrorFromBeyond))
    s = choose(s, 'choice.cardType.asset')
    expect(s.pending?.question.choices.map((c) => c.label)).toEqual([
      'choice.cardType.event',
      'choice.cardType.skill',
    ])
    expect(getInvestigator(s, 'a').hand).toEqual([ASSET, EVENT, SKILL])
    s = choose(s, 'choice.cardType.event')
    expect(getInvestigator(s, 'a').hand).toEqual([SKILL])
    s = during(s, (s) => ({ ...s, phase: 'enemy' }), draw(C.terrorFromBeyond))
    s = choose(s, 'choice.cardType.skill')
    expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
  })

  it('a canceled Terror still counts as drawn for the next copy in that phase', () => {
    let s = during(
      game(),
      (s) => ({ ...s, scenarioMeta: { cancelTerror: 1 } }),
      draw(C.terrorFromBeyond),
    )
    s = during(
      s,
      (s) => ({ ...s, scenarioMeta: { ...s.scenarioMeta, cancelTerror: 0 } }),
      draw(C.terrorFromBeyond),
    )
    s = choose(s, 'choice.cardType.asset')
    expect(s.pending?.question.prompt).toBe('prompt.chooseCardType')
    expect(s.pending?.question.choices).toHaveLength(2)
    s = choose(s, 'choice.cardType.skill')
    expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
  })

  it.each(['enter', 'leave'] as const)(
    'Arcane Barrier tests before moving (%s), even on already checked moves',
    (direction) => {
      let s = during(game(), keep, draw(C.arcaneBarrier))
      if (direction === 'enter') s = during(s, update('a', { location: 'B' }))
      const to = direction === 'enter' ? 'A' : 'B'
      s = during(s, (s) => ({ ...s, chaosBag: [2] }), {
        type: 'MoveTo',
        investigator: 'a',
        location: to,
        checked: true,
      })
      expect(s.skillTest).toMatchObject({ skill: 'willpower', difficulty: 4, tags: ['scenario'] })
      s = resolveTest(s)
      expect(getInvestigator(s, 'a').location).toBe(to)
      expect(copies(s, C.arcaneBarrier)).toHaveLength(0)
    },
  )

  it('canceling a failed barrier move keeps the barrier and spends the move action', () => {
    let s = during(game(), keep, draw(C.arcaneBarrier))
    const before = getInvestigator(s, 'a').actionsRemaining
    s = choose(s, 'action.move', { location: 'Room B' })
    s = choose(resolveTest(s), 'choice.dunwich.cancelMove')
    expect(getInvestigator(s, 'a').location).toBe('A')
    expect(getInvestigator(s, 'a').actionsRemaining).toBe(before - 1)
    expect(copies(s, C.arcaneBarrier)).toHaveLength(1)
  })

  it('a failed barrier can be passed by discarding five, retests on future attempts, and stacks with another barrier', () => {
    let s = during(game(), keep, draw(C.arcaneBarrier), draw(C.arcaneBarrier))
    const before = getInvestigator(s, 'a').deck.length
    s = during(s, keep, { type: 'MoveTo', investigator: 'a', location: 'B' })
    s = choose(resolveTest(s), 'choice.dunwich.discardAndMove')
    expect(s.skillTest?.difficulty).toBe(4)
    s = choose(resolveTest(s), 'choice.dunwich.discardAndMove')
    expect(getInvestigator(s, 'a').location).toBe('B')
    expect(getInvestigator(s, 'a').deck).toHaveLength(before - 10)
    expect(copies(s, C.arcaneBarrier)).toHaveLength(2)
    s = during(s, keep, { type: 'MoveTo', investigator: 'a', location: 'A' })
    expect(s.skillTest?.difficulty).toBe(4)
  })

  it('a barrier elsewhere does not tax an unrelated move', () => {
    let s = during(game(), update('a', { location: 'C' }), draw(C.arcaneBarrier))
    s = during(s, update('a', { location: 'A' }), {
      type: 'MoveTo',
      investigator: 'a',
      location: 'B',
    })
    expect(getInvestigator(s, 'a').location).toBe('B')
    expect(copies(s, C.arcaneBarrier)).toHaveLength(1)
  })
})
