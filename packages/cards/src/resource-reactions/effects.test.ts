// RR: Investigate, Research, Printed Values, Copy, Play/Put into Play, Healing.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  playerCardDef,
  emptyCampaignLog,
  cardCost,
  type GameState,
  type Message,
  type AbilityOption,
} from '@lcg/engine'
import { choose, ghoul } from '@lcg/engine/testing'
import { game, patch, me, withAsset } from '../dunwich-pilot/testing'
import './index'
it('Borrowed Time stores up to three clicks without provoking and removes them for the next turn', () => {
  let s = withAsset(start(), '04308')
  for (let n = 0; n < 3; n++) {
    const o = options(s, '04308')[0]!
    expect(o.provokes).toBe(false)
    s = activate(s, o)
  }
  expect(s.assets['04308']!.uses).toBe(3)
  expect(me(s).actionsRemaining).toBe(0)
  expect(options(s, '04308')).toEqual([])
  const b = playerCardBehavior('04308')!
  expect(b.forced!(s, { type: 'turnBegins', investigator: 'b' }, s.assets['04308']!)).toEqual([])
  s = patch({ actionsRemaining: 3 })(s)
  s = run(s, b.forced!(s, { type: 'turnBegins', investigator: 'a' }, s.assets['04308']!))
  expect(s.assets['04308']!.uses).toBe(0)
  expect(me(s).actionsRemaining).toBe(6)
  expect(playerCardDef('04308')).toMatchObject({ exceptional: true, deckLimit: 1, xp: 3 })
})
it('Compass 2 readies on a failed investigation and retains the limit of three skill boosts', () => {
  let s = withAsset(
    clues(
      patch({ resources: 0, skills: { intellect: 0, willpower: 0, agility: 0, combat: 0 } })(
        start(),
      ),
    ),
    '10122',
  )
  s = activate(s, options(s, '10122')[0]!)
  expect(s.assets['10122']!.exhausted).toBe(false)
  expect(me(s).clues).toBe(0)
})
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const start = (players = ['a']) =>
  patch({
    hand: [],
    resources: 20,
    skills: { willpower: 10, intellect: 10, combat: 10, agility: 10 },
  })({ ...clear(game(players)), chaosBag: [0] })
const run = (s: GameState, m: Message[]) => m.reduce((s, m) => dispatch(s, m), clear(s))
const activate = (s: GameState, o: AbilityOption) =>
  dispatch(clear(s), {
    type: 'UseAbility',
    investigator: 'a',
    key: o.key,
    actions: o.actions,
    provokes: o.provokes,
    ...(o.costs ? { costs: o.costs } : {}),
    then: o.then,
  })
const options = (s: GameState, code: string) =>
  playerCardBehavior(code)!.abilities!(s, s.assets[code]!, 'a')
const clues = (s: GameState, n = 10): GameState => ({
  ...s,
  locations: { ...s.locations, A: { ...s.locations.A!, clues: n, shroud: 2, shroudModifier: 0 } },
})
it('Guiding Stones discovers all bonus clues together for every two points of success', () => {
  let s = withAsset(
    clues(patch({ skills: { willpower: 8, intellect: 8, combat: 8, agility: 8 } })(start())),
    '03192',
  )
  s = activate(s, options(s, '03192')[0]!)
  expect(me(s).clues).toBe(4)
  expect(s.locations.A!.clues).toBe(6)
  expect(s.assets['03192']!.uses).toBe(2)
  expect(playerCardBehavior('03192')!.requiredResearch).toBe('translatedGlyphs')
})
it('Prophecy Foretold does not provoke and optionally evades an engaged enemy after success', () => {
  let s = withAsset(clues(start()), '03193')
  s = {
    ...s,
    enemies: {
      foe: {
        ...ghoul,
        id: 'foe',
        location: 'A',
        engagedWith: 'a',
        health: 20,
        maxHealth: 20,
        damageTaken: 0,
        exhausted: false,
        doom: 0,
      },
    },
  }
  const o = options(s, '03193')[0]!
  expect(o.provokes).toBe(false)
  s = activate(s, o)
  s = choose(s, 'choice.chargedEnemy', { enemy: ghoul.name })
  expect(me(s).damage).toBe(0)
  expect(s.enemies.foe!.exhausted).toBe(true)
  expect(s.enemies.foe!.engagedWith).toBeNull()
  expect(me(s).clues).toBe(1)
})
it('Markings of Isis puts an affordable printed-cost asset into play from hand without playing it', () => {
  let s = withAsset(clues(patch({ hand: ['09103'] })(start())), '52004')
  s = activate(s, options(s, '52004')[0]!)
  s = choose(s, 'choice.toolEntry', { card: playerCardDef('09103')!.name })
  expect(Object.values(s.assets).some((a) => a.code === '09103')).toBe(true)
  expect(me(s).hand).not.toContain('09103')
  expect(me(s).resources).toBe(20)
})
it('an initiated Glyph ability survives the source leaving play before results', () => {
  let s = withAsset(clues(patch({ hand: ['01093'] })(start())), '03192')
  s = activate(s, options(s, '03192')[0]!)
  expect(s.skillTest!.sourceSnapshot!.code).toBe('03192')
  s = dispatch(clear(s), { type: 'DiscardAsset', asset: '03192' })
  s = { ...s, skillTest: { ...s.skillTest!, succeeded: true, modifiedSkill: 10 } }
  s = dispatch(s, { type: 'ApplySkillTestResults' })
  expect(me(s).clues).toBe(5)
  expect(s.assets['03192']).toBeUndefined()
})
it('Ancient Stone records actual difficulty including its +3 shroud and other modifiers', () => {
  let s: GameState = { ...withAsset(clues(start()), '04022'), campaignLog: emptyCampaignLog(['a']) }
  s = dispatch(s, { type: 'ModifyShroud', location: 'A', amount: 2 })
  s = activate(s, options(s, '04022')[0]!)
  expect(me(s).clues).toBe(2)
  expect(s.assets['04022']).toBeUndefined()
  expect(s.campaignLog!.notes).toContain('identifiedStone')
  expect(s.campaignLog!.values?.identifiedStone).toBe('7')
})
it('Mariner Compass can spend resources three times and discovers the extra clue after becoming penniless', () => {
  let s = withAsset(clues(patch({ hand: ['01093'], resources: 3 })(start())), '07121')
  s = activate(s, options(s, '07121')[0]!)
  const b = playerCardBehavior('07121')!
  for (let n = 0; n < 3; n++)
    s = run(s, b.testOptions!(s, s.skillTest!, s.assets['07121']!)[0]!.then)
  expect(me(s).resources).toBe(0)
  expect(s.skillTest!.baseModifier).toBe(3)
  expect(b.testOptions!(s, s.skillTest!, s.assets['07121']!)).toEqual([])
  s = { ...s, skillTest: { ...s.skillTest!, succeeded: true, modifiedSkill: 13 } }
  s = dispatch(s, { type: 'ApplySkillTestResults' })
  expect(me(s).clues).toBe(2)
})
it('Protective Gear pays damage and horror to cancel a Hazard but not another trait', () => {
  let s = withAsset(start(), '08095')
  s = {
    ...s,
    treacheries: {
      hazard: {
        id: 'hazard',
        code: 'test-hazard',
        name: 'Hazard',
        kind: 'treachery',
        traits: ['Hazard'],
        keywords: [],
        placement: { type: 'limbo' },
      },
    },
  }
  const b = playerCardBehavior('08095')!,
    t = { type: 'whenTreacheryDrawn' as const, treachery: 'hazard', investigator: 'a' }
  expect(
    b.reactions!(
      { ...s, treacheries: { hazard: { ...s.treacheries.hazard!, traits: ['Terror'] } } },
      t,
      s.assets['08095']!,
    ),
  ).toEqual([])
  s = run(s, b.reactions!(s, t, s.assets['08095']!)[0]!.then)
  expect(s.assets['08095']).toMatchObject({ damage: 1, horror: 1 })
  expect(s.treacheries.hazard!.canceled).toBe(true)
})
it.each(['08117', '08119'])(
  '%s uses its distinct test difficulty and heals a freely chosen amount with charges',
  (code) => {
    let s = withAsset(patch({ damage: 2, horror: 1 })(start()), code)
    const high = code === '08119',
      o = options(s, code)[0]!
    expect(o.then[0]).toMatchObject({ difficulty: high ? 0 : 1 })
    s = activate(s, o)
    s = choose(s, 'choice.chargedHeal', { kind: 'damage', n: 1 })
    s = choose(s, 'choice.chargedHeal', { kind: 'horror', n: 1 })
    s = choose(s, 'choice.skip')
    expect(me(s)).toMatchObject({ damage: 1, horror: 0 })
    expect(s.assets[code]!.uses).toBe(high ? 4 : 2)
  },
)
it.each(['08117', '08119'])('%s loses resources only on success by zero', (code) => {
  const high = code === '08119',
    b = playerCardBehavior(code)!
  let s = withAsset(start(), code)
  s = dispatch(patch({ hand: ['01093'] })(s), {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'willpower',
    difficulty: 3,
    kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
  })
  s = { ...s, skillTest: { ...s.skillTest!, modifiedSkill: 3, succeeded: true } }
  s = run(s, b.effect!(s, 'a', 'healing', { asset: code }))
  expect(me(s).resources).toBe(high ? 18 : 19)
})
it('Connect the Dots compares printed shroud, not the modified value', () => {
  let s = clues(start())
  s = {
    ...s,
    locations: {
      ...s.locations,
      B: { ...s.locations.A!, id: 'B', name: 'B', shroud: 1, shroudModifier: 20, clues: 2 },
      C: { ...s.locations.A!, id: 'C', name: 'C', shroud: 3, shroudModifier: -3, clues: 2 },
    },
  }
  s = patch({ hand: ['05025'] })(s)
  const r = playerCardBehavior('05025')!.handReactions!(
    s,
    { type: 'afterDiscoverClues', investigator: 'a', location: 'A', last: true },
    'a',
  )[0]!
  s = run(s, r.then)
  s = choose(s, 'choice.resourceClue', { location: 'B' })
  expect(s.locations.B!.clues).toBe(0)
  expect(s.locations.C!.clues).toBe(2)
  expect(me(s).clues).toBe(2)
})
it('Crack the Case distributes effective shroud and grants each investigator their whole share', () => {
  let s = clues(start(['a', 'b']))
  s = patch({ hand: ['05110'] })(s)
  s = dispatch(s, { type: 'ModifyShroud', location: 'A', amount: 1 })
  const before = s.investigators.map((i) => i.resources)
  s = run(
    s,
    playerCardBehavior('05110')!.handReactions!(
      s,
      { type: 'afterDiscoverClues', investigator: 'b', location: 'A', last: true },
      'a',
    )[0]!.then,
  )
  s = choose(s, 'choice.resourceShare', { name: me(s).name })
  s = choose(s, 'choice.resourceShare', { name: me(s).name })
  s = choose(s, 'choice.resourceShare', { name: s.investigators[1]!.name })
  expect(me(s).resources).toBe(before[0]! + 2)
  expect(s.investigators[1]!.resources).toBe(before[1]! + 1)
})
it('Join the Caravan discounts each controlled class and moves to a revealed disconnected location', () => {
  let s = withAsset(withAsset(start(), '08120'), '08121')
  s = {
    ...s,
    locations: {
      ...s.locations,
      B: { ...s.locations.A!, id: 'B', name: 'Remote', connections: [], revealed: true },
    },
  }
  expect(cardCost(s, 'a', '08036')).toBe(1)
  s = run(s, playerCardBehavior('08036')!.play!(s, 'a'))
  s = choose(s, 'choice.pilotMove', { location: 'Remote' })
  expect(me(s).location).toBe('B')
})
it('Lucid Dreaming searches by title across levels, draws the copy and shuffles', () => {
  let s = patch({ hand: ['03025'], deck: ['03192', '01093'] })(start())
  s = run(s, playerCardBehavior('06205')!.play!(s, 'a'))
  s = choose(s, 'choice.resourceDream', { card: playerCardDef('03025')!.name })
  s = choose(s, 'choice.takeCard', { card: playerCardDef('03192')!.name })
  expect(me(s).hand).toContain('03192')
  expect(me(s).deck).not.toContain('03192')
})
it('Joey pays the extra resource to play an Item and discards an Item for two resources', () => {
  let s = withAsset(patch({ hand: ['04203'] })(start()), '06326')
  const b = playerCardBehavior('06326')!
  s = run(s, b.fastOptions!(s, s.assets['06326']!).find((o) => o.key.includes(':play:'))!.then)
  const item = Object.values(s.assets).find((a) => a.code === '04203')!
  expect(me(s).resources).toBe(20 - 1 - playerCardDef('04203')!.cost!)
  s = run(
    s,
    b.fastOptions!(s, s.assets['06326']!).find((o) => o.key.includes(':discard:' + item.id))!.then,
  )
  expect(s.assets[item.id]).toBeUndefined()
  expect(me(s).resources).toBe(20 + 1 - playerCardDef('04203')!.cost!)
})
