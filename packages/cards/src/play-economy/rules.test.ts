// RR: Costs, Fast, Slots, Deckbuilding, Skill Tests, Reaction Opportunities.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  playerCardDef,
  registerPlayerCard,
  registerPlayerCards,
  cardCost,
  skillTestValue,
  restrictedSlotCapacity,
  type GameState,
} from '@lcg/engine'
import { choose, ghoul } from '@lcg/engine/testing'
import { game, patch, me, withAsset } from '../dunwich-pilot/testing'
import { deckSlotsAllow, cardPool, validateDeck } from '../decks'
import data from '../data/play-economy.json'
import './index'
const b = (c: string) => playerCardBehavior(c)!
const clean = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const start = (code: string) => withAsset(patch({ hand: [], resources: 10 })(clean(game())), code)
const play = (s: GameState, code: string) =>
  dispatch(patch({ hand: [code] })(s), {
    type: 'PlayCard',
    investigator: 'a',
    code,
    byEffect: true,
  })
const use = (s: GameState, asset: string) =>
  choose(s, 'choice.playEconomyModifier', { asset: playerCardDef(asset)!.name })
const end = (s: GameState) =>
  s.pending?.question.prompt === 'prompt.playEconomyModifiers'
    ? choose(s, 'choice.playEconomyContinue')
    : s
registerPlayerCards([
  {
    code: 'economy-spell',
    name: 'Economy spell',
    type: 'asset',
    class: 'mystic',
    traits: ['Spell'],
    cost: 3,
    slots: [],
  },
  {
    code: 'economy-creature',
    name: 'Economy creature',
    type: 'asset',
    class: 'survivor',
    traits: ['Creature'],
    cost: 3,
    slots: ['ally'],
  },
  {
    code: 'economy-fast',
    name: 'Economy fast',
    type: 'event',
    class: 'rogue',
    traits: ['Illicit', 'Trick'],
    cost: 3,
    fast: true,
  },
  {
    code: 'economy-test',
    name: 'Economy test',
    type: 'event',
    class: 'survivor',
    traits: ['Tactic', 'Spell'],
    cost: 3,
  },
])
registerPlayerCard({ code: 'economy-fast', play: () => [] })
registerPlayerCard({
  code: 'economy-test',
  play: (_s, id) => [
    {
      type: 'BeginSkillTest',
      investigator: id,
      skill: 'intellect',
      difficulty: 1,
      kind: { type: 'effect', source: 'economy-test', onSuccess: [], onFail: [], onFailEach: [] },
    },
  ],
})
it.each(data)('$code registers a reviewed rule', (c) => expect(b(c.code)).toBeDefined())
it.each(['60412', '60422', '04236', '53010', '08128'])(
  '%s offers an optional, actually paid discount with the correct exhaust cost',
  (code) => {
    const target = code === '08128' ? 'economy-creature' : 'economy-test'
    const before = start(code),
      opt = b(code).playModifiers!(before, before.assets[code]!, target, false)[0]!
    const out = end(use(play(before, target), code))
    expect(me(out).resources).toBe(10 - 3 + (opt.discount ?? 0))
    expect(out.assets[code]!.exhausted).toBe(code !== '08128')
    expect(
      b(code).playModifiers!({ ...before, activeTurn: 'b' }, before.assets[code]!, target, false)
        .length,
    ).toBe(code === '08128' ? 0 : 1)
  },
)
it('discounts stack, cannot be reused for one play, and can make an unaffordable play legal', () => {
  let s = withAsset(start('60422'), '04236')
  s = patch({ resources: 0 })(s)
  expect(cardCost(s, 'a', 'economy-test')).toBe(0)
  s = use(play(s, 'economy-test'), '60422')
  s = use(s, '04236')
  s = end(s)
  expect(me(s).resources).toBe(0)
  expect(me(s).discard).toContain('economy-test')
  expect(s.assets['60422']!.exhausted).toBe(true)
  expect(s.assets['04236']!.exhausted).toBe(true)
  let rod = start('08128')
  rod = use(play(rod, 'economy-creature'), '08128')
  expect(
    rod.pending?.question.choices.some((c) => c.label === 'choice.playEconomyModifier'),
  ).not.toBe(true)
  expect(me(rod).resources).toBe(8)
})
it('declining a discount keeps its source ready and pays the full price', () => {
  const s = choose(play(start('60412'), 'economy-spell'), 'choice.playEconomyContinue')
  expect(me(s).resources).toBe(7)
  expect(s.assets['60412']!.exhausted).toBe(false)
})
it('Ceremonial Robes applies to the first Spell/Ritual played in the round, even before equipping it', () => {
  let s = start('60470')
  s = end(play(s, 'economy-spell'))
  expect(me(s).resources).toBe(8)
  expect(cardCost(s, 'a', 'economy-spell')).toBe(3)
  s = { ...s, round: s.round + 1 }
  expect(cardCost(s, 'a', 'economy-spell')).toBe(2)
  s = patch({ roundPlays: { round: s.round, codes: ['economy-test'] } })(s)
  expect(cardCost(s, 'a', 'economy-spell')).toBe(3)
})
it('Rod grants two Creature-only slots, and discounts again on a later play without exhausting', () => {
  let s = start('08128')
  expect(restrictedSlotCapacity(s, 'a', 'ally')).toContainEqual({ trait: 'Creature', count: 2 })
  s = end(use(play(s, 'economy-creature'), '08128'))
  s = end(use(play(clean(s), 'economy-creature'), '08128'))
  expect(me(s).resources).toBe(6)
  expect(s.assets['08128']!.exhausted).toBe(false)
  expect(b('08128').playModifiers!(s, s.assets['08128']!, '01016', false)).toEqual([])
})
it('On Your Own discards for an occupied ally slot, but not a slotless ally; its permanent version restricts deckbuilding', () => {
  let s = withAsset(start('04236'), '01033')
  const a = s.assets['04236']!
  expect(b('04236').forced!(s, { type: 'roundEnds' }, a)).toEqual([
    { type: 'DiscardAsset', asset: a.id },
  ])
  s = { ...s, assets: { ...s.assets, '01033': { ...s.assets['01033']!, noSlot: true } } }
  expect(b('04236').forced!(s, { type: 'roundEnds' }, a)).toEqual([])
  expect(deckSlotsAllow(['53010'], playerCardDef('01033')!)).toBe(false)
  expect(deckSlotsAllow(['04236'], playerCardDef('01033')!)).toBe(true)
  expect(cardPool('01005', { deck: ['53010'] }).some((c) => c.slots?.includes('ally'))).toBe(false)
  expect(
    validateDeck({
      id: 'test',
      name: 'test',
      investigator: '01005',
      cards: ['53010', '01033'],
    }).problems.some((p) => p.key === 'deck.problem.notAllowed'),
  ).toBe(true)
})
it.each(['09072', '60332'])(
  '%s offers the correct combinations, skill bonus only during the event, and no repeated exhaustion',
  (code) => {
    let s = { ...start(code), interactive: true }
    s = play(s, 'economy-test')
    s = choose(s, 'choice.playEconomyModifier', { asset: playerCardDef(code)!.name, bonus: 2 })
    s = end(s)
    expect(skillTestValue(s).total).toBe(me(s).skills.intellect + 2)
    expect(me(s).resources).toBe(code === '09072' ? 7 : 9)
    expect(s.assets[code]!.exhausted).toBe(true)
    s = choose({ ...s, chaosBag: [0] }, 'choice.revealToken')
    s = choose(s, 'choice.applyResults')
    expect(s.playSkillBonuses).toEqual([])
  },
)
it.each(['04108', '09072', '60332'])(
  '%s grants Fast only during your turn and pays the chosen cost, without an action',
  (code) => {
    const target = code === '04108' ? 'economy-spell' : 'economy-test'
    // Fence requires Illicit; use a native Fast Illicit event instead.
    const card = code === '04108' ? 'economy-fast' : target
    let s = patch({ hand: [card] })(start(code))
    const a = s.assets[code]!,
      opts = b(code).fastOptions!(s, a)
    expect(opts).toHaveLength(code === '60332' ? 2 : 1)
    expect(b(code).fastOptions!({ ...s, activeTurn: 'b' }, a)).toEqual([])
    const actions = me(s).actionsRemaining
    s = dispatch(s, ...opts[0]!.then)
    s = end(s)
    expect(me(s).actionsRemaining).toBe(actions)
    expect(me(s).resources).toBe(code === '04108' ? 8 : code === '09072' ? 7 : 9)
    expect(s.assets[code]!.exhausted).toBe(true)
    expect(b(code).fastOptions!(s, s.assets[code]!)).toEqual([])
  },
)
it('level 2 Robes prevents the play’s opportunity attack; level 0 still provokes it', () => {
  for (const code of ['60412', '60422']) {
    let s = start(code)
    s = {
      ...s,
      enemies: {
        foe: {
          ...ghoul,
          id: 'foe',
          location: 'A',
          engagedWith: 'a',
          exhausted: false,
          damageTaken: 0,
          maxHealth: 2,
          doom: 0,
        },
      },
    }
    s = dispatch(patch({ hand: ['economy-spell'] })(s), {
      type: 'PlayCard',
      investigator: 'a',
      code: 'economy-spell',
      before: [{ type: 'AssignDamage', investigator: 'a', damage: 1, horror: 0 }],
    })
    s = use(s, code)
    s = end(s)
    if (code === '60422') expect(me(s).damage).toBe(0)
    else expect(s.pending?.question.prompt).toBe('prompt.assignDamage')
  }
})
it('Fence accelerates a non-fast Illicit asset, and combines with Chuck to make an otherwise unaffordable Fast play', () => {
  registerPlayerCards([
    {
      code: 'economy-illicit',
      name: 'Economy illicit',
      type: 'asset',
      class: 'rogue',
      traits: ['Illicit'],
      cost: 3,
      slots: [],
    },
    {
      code: 'economy-illicit-event',
      name: 'Economy illicit event',
      type: 'event',
      class: 'rogue',
      traits: ['Illicit', 'Tactic'],
      cost: 3,
    },
  ])
  registerPlayerCard({ code: 'economy-illicit-event', play: () => [] })
  let s = patch({ hand: ['economy-illicit'] })(start('04108'))
  const actions = me(s).actionsRemaining
  s = dispatch(s, ...b('04108').fastOptions!(s, s.assets['04108']!)[0]!.then)
  s = end(s)
  expect(me(s).resources).toBe(7)
  expect(me(s).actionsRemaining).toBe(actions)
  s = patch({ hand: ['economy-illicit-event'], resources: 2 })(withAsset(start('04108'), '09072'))
  const opts = b('09072').fastOptions!(s, s.assets['09072']!)
  expect(opts).toHaveLength(1)
  s = dispatch(s, ...opts[0]!.then)
  s = end(use(s, '04108'))
  expect(me(s).resources).toBe(0)
  expect(s.assets['04108']!.exhausted).toBe(true)
  expect(s.assets['09072']!.exhausted).toBe(true)
})
