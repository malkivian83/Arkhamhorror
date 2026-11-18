// RR: Search, Spawn (not Draw), Revelation, Instead, Then, Dilemma, Peril.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  playerCardDef,
  registerEnemy,
  registerTreachery,
  type GameState,
  type Message,
  type EncounterCard,
} from '@lcg/engine'
import { choose, ghoul } from '@lcg/engine/testing'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'
import data from '../data/encounter-search.json'
import './index'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const base = () => ({
  ...clear(
    patch({
      hand: [],
      discard: [],
      deck: ['01088', '01089', '01090', '01091'],
      resources: 10,
      actionsRemaining: 3,
    })(game(['a', 'b'])),
  ),
  interactive: true,
  encounterDiscard: [],
})
const run = (s: GameState, ...m: Message[]) => dispatch(clear(s), ...m)
const b = (c: string) => playerCardBehavior(c)!
const play = (s: GameState, c: string) =>
  run(patch({ hand: [c] })(s), {
    type: 'TakeAction',
    investigator: 'a',
    action: { kind: 'play', card: c },
  })
const trap: EncounterCard = {
  kind: 'treachery',
  code: 'search-trap',
  name: 'Search trap',
  keywords: [],
}
registerTreachery({
  code: trap.code,
  revelation: (_s, by) => [{ type: 'GainResources', investigator: by, amount: 1 }],
})
const enemy = (code = 'searched-enemy', extra = {}) => ({ ...ghoul, code, name: code, ...extra })
const chooseEnemy = (s: GameState, name = 'searched-enemy', discard = false) =>
  choose(s, discard ? 'choice.searchEncounterDiscardEnemy' : 'choice.searchEncounterDeckEnemy', {
    enemy: name,
  })
const draw = (s: GameState, c: string) =>
  run(
    { ...patch({ hand: [c] })(s), phase: 'mythos' },
    { type: 'DrawEncounterCard', investigator: 'a' },
  )
const useHunt = (s: GameState, c: string) =>
  choose(draw(s, c), 'ability.playCard', { card: playerCardDef(c)!.name })
const id = (s: GameState) => Object.keys(s.enemies)[0]!
it.each(data)('$code registers its reviewed level and source', (c) => {
  expect(b(c.code)).toBeDefined()
  expect(playerCardDef(c.code)?.xp).toBe(c.xp)
})
it.each(['03263', '08028'])(
  '%s replaces exactly one mythos draw and spawns engaged without resolving surge or normal spawn',
  (code) => {
    registerEnemy({ code: 'search-remote', spawn: () => ['C'] })
    let s: GameState = {
      ...base(),
      encounterDeck: [enemy('search-remote', { keywords: ['surge'] }), trap],
    }
    s = useHunt(s, code)
    s = chooseEnemy(s, 'search-remote')
    expect(Object.values(s.enemies)).toHaveLength(1)
    expect(s.enemies[id(s)]).toMatchObject({ location: 'A', engagedWith: 'a' })
    expect(s.encounterDeck).toEqual([trap])
    expect(s.encounterDiscard).toEqual([])
    expect(me(s).actionsRemaining).toBe(3)
    expect(me(s).resources).toBe(code === '03263' ? 9 : 10)
  },
)
it.each(['03263', '08028'])('%s is offered only to its drawer during mythos', (code) => {
  const s = base(),
    t = { type: 'wouldDrawTopEncounter' as const, investigator: 'a' }
  expect(b(code).handReactions!(s, t, 'a')).toEqual([])
  expect(b(code).handReactions!({ ...s, phase: 'mythos' }, t, 'b')).toEqual([])
  expect(b(code).handReactions!({ ...s, phase: 'mythos' }, t, 'a')).toHaveLength(1)
  expect(b(code).canPlay!(s, 'a')).toBe(false)
})
it('Hunt zero sees only nine cards, permits Elite, and draws normally after a miss', () => {
  let s = useHunt({ ...base(), encounterDeck: [...Array(9).fill(trap), enemy()] }, '03263')
  expect(Object.values(s.enemies).length + s.encounterDiscard.length).toBe(1)
  expect(s.encounterDeck).toHaveLength(9)
  s = chooseEnemy(
    useHunt({ ...base(), encounterDeck: [enemy('elite', { traits: ['Elite'] })] }, '03263'),
    'elite',
  )
  expect(s.enemies[id(s)]?.traits).toContain('Elite')
})
it('Hunt three searches beyond nine and has no fallback draw if there is no enemy', () => {
  let s = useHunt({ ...base(), encounterDeck: [...Array(9).fill(trap), enemy()] }, '08028')
  s = chooseEnemy(s)
  expect(s.encounterDeck).toHaveLength(9)
  const miss = useHunt({ ...base(), encounterDeck: [trap] }, '08028')
  expect(miss.encounterDeck).toEqual([trap])
  expect(miss.encounterDiscard).toEqual([])
})
it('Hunt three attaches and its owner can gain three resources when defeating that exact enemy', () => {
  let s = chooseEnemy(useHunt({ ...base(), encounterDeck: [enemy()] }, '08028'))
  expect(Object.values(s.treacheries).some((t) => t.code === '08028')).toBe(true)
  const eid = id(s)
  s = run(s, { type: 'DefeatEnemy', enemy: eid, by: 'a' })
  s = choose(s, 'ability.advancedTest', { card: playerCardDef('08028')!.name })
  expect(me(s).resources).toBe(13)
  expect(me(s).discard).toContain('08028')
})
it.each(['b', 'discard'])('Hunt three does not pay when the enemy leaves by %s', (how) => {
  let s = chooseEnemy(useHunt({ ...base(), encounterDeck: [enemy()] }, '08028'))
  s = run(
    s,
    how === 'discard'
      ? { type: 'DiscardEnemy', enemy: id(s) }
      : { type: 'DefeatEnemy', enemy: id(s), by: how },
  )
  expect(me(s).resources).toBe(10)
  expect(
    s.pending?.question.choices.some((c) => c.params?.card === playerCardDef('08028')!.name),
  ).not.toBe(true)
})
it('Hornet searches nine, excludes Elite, and grants one clue and scaled health resources after spawning', () => {
  let s = play(
    {
      ...base(),
      encounterDeck: [
        enemy('elite', { traits: ['Elite'] }),
        enemy('scaled', { health: 3, healthPerInvestigator: true }),
      ],
    },
    '09068',
  )
  expect(s.pending?.question.choices).toHaveLength(1)
  s = chooseEnemy(s, 'scaled')
  expect(s.enemies[id(s)]).toMatchObject({ maxHealth: 6, engagedWith: 'a' })
  expect(me(s).clues).toBe(1)
  expect(me(s).resources).toBe(16)
})
it('Hornet pays its action but gives no clue or resources if the search fails', () => {
  const s = play({ ...base(), encounterDeck: [trap] }, '09068')
  expect(me(s).actionsRemaining).toBe(2)
  expect(me(s).clues).toBe(0)
  expect(me(s).resources).toBe(10)
  expect(s.encounterDeck).toEqual([trap])
})
it('search playability does not disclose whether hidden encounter cards contain an eligible enemy', () => {
  const s = { ...base(), encounterDeck: [trap] }
  expect(b('09068').canPlay!(s, 'a')).toBe(true)
  expect(b('11053').canPlay!(s, 'a')).toBe(true)
})
it.each([false, true])(
  'Party chooses from discard=%s and spawns exhausted but engaged before drawing damage plus horror',
  (discard) => {
    let s = play(
      {
        ...base(),
        encounterDeck: discard ? [trap] : [enemy('party', { damage: 2, horror: 1 })],
        encounterDiscard: discard ? [enemy('party', { damage: 2, horror: 1 })] : [],
      },
      '11053',
    )
    s = chooseEnemy(s, 'party', discard)
    expect(s.enemies[id(s)]).toMatchObject({ exhausted: true, engagedWith: 'a', location: 'A' })
    expect(me(s).hand).toHaveLength(3)
    expect(s.encounterDiscard).toEqual([])
    expect(me(s).damage).toBe(0)
  },
)
it('Party rejects Elite in either zone and its parley action does not provoke attacks', () => {
  const s = {
    ...base(),
    encounterDeck: [],
    encounterDiscard: [enemy('elite', { traits: ['Elite'] })],
  }
  expect(b('11053').canPlay!(s, 'a')).toBe(false)
  expect(b('11053').parley).toBe(true)
})
const hymn = (bag: GameState['chaosBag'] = []) =>
  play(
    {
      ...base(),
      chaosBag: bag,
      encounterDeck: [
        enemy('one'),
        enemy('two'),
        enemy('three'),
        enemy('four'),
        enemy('five'),
        enemy('six'),
      ],
    },
    '10093',
  )
it('Hymn pays two actions, adds one curse per bottomed card, and orders the other five exactly', () => {
  let s = hymn()
  expect(me(s).actionsRemaining).toBe(1)
  expect(me(s).resources).toBe(8)
  s = choose(s, 'choice.encounterPlaceBottom', { card: 'two' })
  s = choose(s, 'choice.encounterPlaceBottom', { card: 'four' })
  s = choose(s, 'choice.encounterFinishBottom')
  for (const card of ['five', 'one', 'three']) s = choose(s, 'choice.encounterTopOrder', { card })
  expect(s.encounterDeck.map((c) => c.code)).toEqual(['five', 'one', 'three', 'six', 'two', 'four'])
  expect(s.chaosBag.filter((t) => t === 'curse')).toHaveLength(2)
})
it('Hymn stops offering curse costs when the pool is empty and can keep all cards on top', () => {
  let s = hymn(Array(10).fill('curse'))
  expect(s.pending?.question.choices).toHaveLength(1)
  s = choose(s, 'choice.encounterFinishBottom')
  for (const card of ['five', 'four', 'three', 'two', 'one'])
    s = choose(s, 'choice.encounterTopOrder', { card })
  expect(s.encounterDeck.map((c) => c.code)).toEqual(['five', 'four', 'three', 'two', 'one', 'six'])
  expect(s.chaosBag).toHaveLength(10)
})
it('Hymn never inspects past a short deck and can place every revealed card on the bottom', () => {
  let s = play({ ...base(), encounterDeck: [enemy('one'), enemy('two')] }, '10093')
  s = choose(s, 'choice.encounterPlaceBottom', { card: 'two' })
  s = choose(s, 'choice.encounterPlaceBottom', { card: 'one' })
  s = choose(s, 'choice.encounterFinishBottom')
  expect(s.encounterDeck.map((c) => c.code)).toEqual(['two', 'one'])
})
it('Hymn cannot pay its additional action when only one remains', () => {
  expect(() => play(patch({ actionsRemaining: 1 })(base()), '10093')).toThrow(
    'No hay acciones suficientes',
  )
})

const beast = () =>
  run(
    {
      ...patch({ deck: ['09111', '01088'] })(base()),
      encounterDeck: [trap, enemy('second'), enemy('third'), enemy('fourth')],
    },
    { type: 'DrawCards', investigator: 'a', amount: 1 },
  )
it('Beast is a Dilemma drawn rather than played; it chooses another drawer and then a remote clue recipient', () => {
  let s = beast()
  expect(b('09111').canPlay!(s, 'a')).toBe(false)
  s = choose(s, 'choice.encounterBeastDraw', { card: trap.name, name: 'B' })
  expect(s.investigators[1]?.resources).toBe(6)
  expect(s.encounterDiscard.map((c) => c.code).sort()).toEqual(
    ['second', 'third', trap.code].sort(),
  )
  s = choose(s, 'choice.encounterBeastClue', { name: 'A', location: 'Room A' })
  expect(me(s).clues).toBe(1)
  expect(s.encounterDeck.map((c) => c.code)).toEqual(['fourth'])
  expect(me(s).discard).toContain('09111')
})
it('Beast resolves a genuine draw (including enemy spawn instructions), unlike the search events', () => {
  registerEnemy({ code: 'beast-remote', spawn: () => ['C'] })
  let s = run(
    { ...patch({ deck: ['09111'] })(base()), encounterDeck: [enemy('beast-remote')] },
    { type: 'DrawCards', investigator: 'a', amount: 1 },
  )
  s = choose(s, 'choice.encounterBeastDraw', { card: 'beast-remote', name: 'A' })
  expect(s.enemies[id(s)]?.location).toBe('C')
})
it('the third Dilemma in the round discards without inspecting the encounter deck', () => {
  const s = run(
    {
      ...patch({ deck: ['09111'] })(base()),
      dilemmasResolved: { round: 1, count: 2 },
      encounterDeck: [trap],
    },
    { type: 'DrawCards', investigator: 'a', amount: 1 },
  )
  expect(s.encounterDeck).toEqual([trap])
  expect(s.pending).toBeNull()
  expect(me(s).discard).toContain('09111')
})
it('Beast handles a short deck without fabricating cards, and no cards means no post-then clue', () => {
  let s = run(
    { ...patch({ deck: ['09111'] })(base()), encounterDeck: [trap] },
    { type: 'DrawCards', investigator: 'a', amount: 1 },
  )
  expect(s.pending?.question.choices).toHaveLength(2)
  s = choose(s, 'choice.encounterBeastDraw', { card: trap.name, name: 'A' })
  s = choose(s, 'choice.encounterBeastClue', { name: 'B', location: 'Room A' })
  expect(s.investigators[1]?.clues).toBe(1)
  const empty = run(
    { ...patch({ deck: ['09111'] })(base()), encounterDeck: [] },
    { type: 'DrawCards', investigator: 'a', amount: 1 },
  )
  expect(empty.pending).toBeNull()
  expect(me(empty).clues).toBe(0)
})
it('Hymn inspection and its choices survive JSON serialization without losing or duplicating cards', () => {
  let s = JSON.parse(JSON.stringify(hymn())) as GameState
  s = choose(s, 'choice.encounterPlaceBottom', { card: 'one' })
  s = choose(s, 'choice.encounterFinishBottom')
  for (const card of ['two', 'three', 'four', 'five'])
    s = choose(s, 'choice.encounterTopOrder', { card })
  expect(s.encounterDeck.map((c) => c.code)).toEqual(['two', 'three', 'four', 'five', 'six', 'one'])
})
it('replacing a draw closes its replacement window for both other Hunt copies and Cryptic Grimoire', () => {
  let s = withAsset(patch({ hand: ['08028', '03263'] })(base()), '07192', { uses: 5 })
  s = run(
    { ...s, phase: 'mythos', encounterDeck: [enemy(), trap] },
    { type: 'DrawEncounterCard', investigator: 'a' },
  )
  s = choose(s, 'ability.playCard', { card: playerCardDef('08028')!.name })
  s = chooseEnemy(s)
  expect(s.assets['07192']?.uses).toBe(5)
  expect(me(s).hand).toContain('03263')
  expect(s.pending).toBeNull()
})
it('Hunt three can decline its defeat reward and the attachment cannot react to a different defeated enemy', () => {
  let s = chooseEnemy(useHunt({ ...base(), encounterDeck: [enemy()] }, '08028'))
  const attached = Object.values(s.treacheries).find((t) => t.code === '08028')!
  expect(b('08028')).toBeDefined()
  const other = run(s, {
    type: 'SpawnEnemy',
    card: enemy('other'),
    location: 'A',
    engageWith: null,
  })
  s = run(other, {
    type: 'DefeatEnemy',
    enemy: Object.keys(other.enemies).find((k) => k !== id(s))!,
    by: 'a',
  })
  expect(me(s).resources).toBe(10)
  expect(s.treacheries[attached.id]).toBeDefined()
  s = run(s, { type: 'DefeatEnemy', enemy: id(s), by: 'a' })
  s = choose(s, 'choice.skip')
  expect(me(s).resources).toBe(10)
})
it('Beast can give its clue to an investigator far from the chosen revealed location', () => {
  let s = run(
    {
      ...patch({ deck: ['09111'] })(base()),
      encounterDeck: [trap],
      locations: { ...base().locations, B: { ...base().locations.B!, revealed: true, clues: 2 } },
    },
    { type: 'DrawCards', investigator: 'a', amount: 1 },
  )
  s = choose(s, 'choice.encounterBeastDraw', { card: trap.name, name: 'A' })
  s = choose(s, 'choice.encounterBeastClue', { name: 'B', location: 'Room B' })
  expect(s.investigators[1]?.location).toBe('A')
  expect(s.investigators[1]?.clues).toBe(1)
  expect(s.locations.B?.clues).toBe(1)
})
it('Hymn reevaluates the remaining curse supply after each paid placement', () => {
  let s = hymn(Array(9).fill('curse'))
  s = choose(s, 'choice.encounterPlaceBottom', { card: 'one' })
  expect(s.chaosBag).toHaveLength(10)
  expect(s.pending?.question.choices.map((c) => c.label)).toEqual(['choice.encounterFinishBottom'])
})
it('a missed Hunt zero creates a new draw that Cryptic Grimoire can replace', () => {
  let s = useHunt({ ...withAsset(base(), '07192', { uses: 5 }), encounterDeck: [trap] }, '03263')
  s = choose(s, 'ability.advancedTest', { card: playerCardDef('07192')!.name })
  expect(s.assets['07192']?.uses).toBe(0)
  expect(s.encounterDeck).toEqual([trap])
  expect(s.encounterDiscard).toEqual([])
  expect(me(s).hand).toEqual(['01088'])
})
