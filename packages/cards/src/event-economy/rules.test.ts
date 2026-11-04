// RR: Costs, Play, Reactions, Skill Tests, Success/Failure, Defeat, Uses, Additional Actions.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  playerCardDef,
  registerPlayerCards,
  registerPlayerCard,
  skillTestValue,
  type GameState,
  type Message,
  type Trigger,
} from '@lcg/engine'
import { choose, ghoul } from '@lcg/engine/testing'
import { game, patch, me, withAsset } from '../dunwich-pilot/testing'
import { resolve } from '../basic-abilities/testing'
import data from '../data/event-economy.json'
import './index'
const b = (c: string) => playerCardBehavior(c)!
const clean = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const start = () =>
  patch({ hand: [], deck: ['01088', '01088', '01088'], discard: [], resources: 10 })(
    clean(game(['a', 'b'])),
  )
const asset = (c: string) => withAsset(start(), c)
const play = (s: GameState, c: string) =>
  dispatch(patch({ hand: [...me(s).hand, c] })(s), {
    type: 'PlayCard',
    investigator: 'a',
    code: c,
    byEffect: true,
  })
const foe = (s: GameState, changes: Partial<import('@lcg/engine').Enemy> = {}): GameState => ({
  ...s,
  enemies: {
    foe: {
      ...ghoul,
      id: 'foe',
      location: 'A',
      engagedWith: 'a',
      maxHealth: 12,
      damageTaken: 0,
      doom: 0,
      exhausted: false,
      ...changes,
    },
  },
})
const trigger = (s: GameState, c: string, t: Trigger) => b(c).reactions!(s, t, s.assets[c]!)
const use = (s: GameState, c: string, t: Trigger) => dispatch(s, ...trigger(s, c, t)[0]!.then)
const test = (s: GameState, difficulty = 1) =>
  dispatch(
    { ...s, interactive: true },
    {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'intellect',
      difficulty,
      kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
    },
  )
registerPlayerCards([
  {
    code: 'event-tool',
    name: 'Event tool',
    type: 'asset',
    class: 'seeker',
    traits: ['Tool'],
    cost: 1,
    slots: [],
    uses: { count: 3, type: 'supply' },
  },
  {
    code: 'event-charge',
    name: 'Event charge',
    type: 'asset',
    class: 'mystic',
    traits: ['Spell'],
    cost: 1,
    slots: [],
    uses: { count: 3, type: 'charge' },
  },
  {
    code: 'event-item',
    name: 'Event item',
    type: 'asset',
    class: 'guardian',
    traits: ['Item'],
    cost: 2,
    slots: [],
  },
  {
    code: 'event-spell-one',
    name: 'Event spell one',
    type: 'event',
    class: 'mystic',
    traits: ['Spell'],
    cost: 1,
  },
  {
    code: 'event-spell-two',
    name: 'Event spell two',
    type: 'event',
    class: 'mystic',
    traits: ['Spell'],
    cost: 3,
  },
  {
    code: 'event-spell-test',
    name: 'Event spell test',
    type: 'event',
    class: 'mystic',
    traits: ['Spell'],
    cost: 2,
  },
])
registerPlayerCard({
  code: 'event-spell-one',
  play: (_s, by) => [{ type: 'GainResources', investigator: by, amount: 3 }],
})
registerPlayerCard({ code: 'event-spell-two', play: () => [] })
registerPlayerCard({
  code: 'event-spell-test',
  play: (_s, by) => [
    {
      type: 'BeginSkillTest',
      investigator: by,
      skill: 'intellect',
      difficulty: 1,
      kind: { type: 'effect', source: 'spell-test', onSuccess: [], onFail: [], onFailEach: [] },
    },
  ],
})
it.each(data)('$code is registered once with reviewed behavior', (c) =>
  expect(b(c.code)).toBeDefined(),
)
it('Ever Vigilant lets nearby players play four assets sequentially with a discount, paying their own resources', () => {
  let s = patch({ hand: Array(5).fill('event-item') })(start())
  s = patch({ hand: ['event-item'], resources: 1 }, 'b')(s)
  s = play(s, '09039')
  s = choose(s, 'choice.eventPlay', { name: 'B', card: 'Event item' })
  expect(s.investigators[1]!.resources).toBe(0)
  for (let n = 0; n < 3; n++) s = choose(s, 'choice.eventPlay', { name: 'A', card: 'Event item' })
  expect(Object.values(s.assets).filter((a) => a.code === 'event-item')).toHaveLength(4)
  expect(me(s).resources).toBe(7)
  expect(s.pending).toBeNull()
})
it('Geared Up loses three actions once and resolves any number of discounted Items before the next choice', () => {
  let s = patch({ hand: Array(6).fill('event-item'), resources: 6 })(asset('08019'))
  const a = s.assets['08019']!
  s = dispatch(s, ...b('08019').forced!(s, { type: 'turnBegins', investigator: 'a' }, a))
  for (let n = 0; n < 6; n++) s = choose(s, 'choice.eventPlay', { card: 'Event item' })
  s = choose(s, 'choice.skip')
  expect(me(s).actionsRemaining).toBe(0)
  expect(me(s).resources).toBe(0)
  expect(Object.values(s.assets).filter((a) => a.code === 'event-item')).toHaveLength(6)
  expect(
    b('08019').forced!(s, { type: 'turnBegins', investigator: 'a' }, s.assets['08019']!),
  ).toEqual([])
})
it('Ethereal Weaving reveals at most three different events first, then each full resolution can fund the next', () => {
  let s = patch({
    hand: ['event-spell-one', 'event-spell-one', 'event-spell-two', 'event-spell-test'],
    resources: 2,
  })(start())
  s = play(s, '10103')
  s = choose(s, 'choice.eventReveal', { card: 'Event spell one' })
  expect(
    s.pending!.question.choices.filter((c) => c.params?.card === 'Event spell one'),
  ).toHaveLength(0)
  s = choose(s, 'choice.eventReveal', { card: 'Event spell two' })
  s = choose(s, 'choice.eventFinishReveal')
  s = choose(s, 'choice.eventPlay', { card: 'Event spell one' })
  expect(me(s).resources).toBe(4)
  s = choose(s, 'choice.eventPlay', { card: 'Event spell two' })
  expect(me(s).resources).toBe(2)
  expect(me(s).hand).toContain('event-spell-one')
  expect(me(s).actionsRemaining).toBe(2)
})
it('the +2 granted by Ethereal Weaving applies to the chosen event test and ends with its resolution', () => {
  let s = patch({ hand: ['event-spell-test'] })({ ...start(), interactive: true })
  s = play(s, '10103')
  s = choose(s, 'choice.eventReveal', { card: 'Event spell test' })
  s = choose(s, 'choice.eventFinishReveal')
  s = choose(s, 'choice.eventPlay', { card: 'Event spell test' })
  expect(skillTestValue(s).total).toBe(me(s).skills.intellect + 2)
  s = resolve(s)
  expect(s.playSkillBonuses).toEqual([])
})
it('Cosmic Revelation snapshots non-weakness printed costs, then offers a draw or one revealed play in player order', () => {
  let s = patch({ hand: ['event-item', 'event-spell-one'] })(start())
  s = patch({ hand: ['event-item'], resources: 2 }, 'b')(s)
  s = play(s, '11041')
  s = choose(s, 'choice.eventEven')
  s = choose(s, 'choice.continue')
  expect(s.pending!.investigator).toBe('a')
  expect(
    s
      .pending!.question.choices.filter((c) => c.label === 'choice.eventPlay')
      .map((c) => c.params?.card),
  ).toEqual(['Event item'])
  s = choose(s, 'choice.eventDraw')
  expect(s.pending!.investigator).toBe('b')
  s = choose(s, 'choice.eventPlay', { card: 'Event item' })
  expect(s.investigators[1]!.resources).toBe(0)
  expect(Object.values(s.assets).some((a) => a.owner === 'b' && a.code === 'event-item')).toBe(true)
})
it.each([false, true])(
  'Name Your Price deals the printed non-Elite/Elite damage (%s) and removes the resolving event',
  (elite) => {
    const s = play(
      foe(patch({ resources: 30 })(start()), { traits: elite ? ['Elite'] : [], maxHealth: 20 }),
      '11105',
    )
    expect(s.enemies.foe!.damageTaken).toBe(elite ? 5 : 10)
    expect(me(s).discard).not.toContain('11105')
  },
)
it.each(['60160', '60274'])(
  '%s tests remaining health with the correct skill and resolves only on success',
  (code) => {
    let s = play({ ...foe(start(), { damageTaken: 10 }), interactive: true }, code)
    expect(s.skillTest!.difficulty).toBe(2)
    expect(s.skillTest!.skill).toBe(code === '60160' ? 'combat' : 'intellect')
    s = resolve(s)
    if (code === '60160') {
      expect(s.enemies.foe!.exhausted).toBe(true)
      expect(me(s).clues).toBe(1)
    } else {
      expect(s.enemies.foe).toBeUndefined()
      expect(s.encounterDeck.some((c) => c.code === ghoul.code)).toBe(true)
      expect(s.log.some((entry) => entry.key === 'log.eventEnemyShuffled')).toBe(true)
    }
    expect(b('60274').canPlay!(foe(start(), { traits: ['Elite'] }), 'a')).toBe(false)
  },
)
it('Insidious Truths scales the test and damage from the number actually discarded as its additional cost', () => {
  let s = patch({ hand: ['01088', '01088'] })({ ...foe(start()), interactive: true })
  s = play(s, '60266')
  s = choose(s, 'choice.takeCard', { card: playerCardDef('01088')!.name })
  s = choose(s, 'choice.takeCard', { card: playerCardDef('01088')!.name })
  expect(s.skillTest!.baseModifier).toBe(4)
  expect(s.skillTest!.kind.type === 'fight' && s.skillTest!.kind.extraDamage).toBe(2)
  s = resolve(s)
  expect(s.enemies.foe!.damageTaken).toBe(3)
})
it('Bounty uses printed health, caps at six, allocates before gaining and can give resources to another local investigator', () => {
  const base = patch({ hand: ['60161'] })(foe(start(), { health: 2, maxHealth: 6 })),
    t = { type: 'enemyDefeated' as const, enemy: base.enemies.foe! }
  let s = dispatch(base, ...b('60161').handReactions!(base, t, 'a')[0]!.then)
  s = choose(s, 'choice.eventAllocate', { name: 'B' })
  s = choose(s, 'choice.eventAllocate', { name: 'A' })
  expect(me(s).resources).toBe(10 - playerCardDef('60161')!.cost! + 1)
  expect(s.investigators[1]!.resources).toBe(6)
  const large = { ...t, enemy: { ...t.enemy, health: 10 } }
  expect(b('60161').handReactions!(base, large, 'a')[0]!.then[0]).toMatchObject({
    effect: [{ data: { remaining: 6 } }],
  })
  expect(
    b('60161').handReactions!(base, { ...t, enemy: { ...t.enemy, location: 'B' } }, 'a'),
  ).toEqual([])
})
it('Sherman boosts combat, soaks locally and exhausts after damage to discover a clue, never after horror only', () => {
  const s = asset('60177'),
    a = s.assets['60177']!,
    t = { type: 'afterAssetDamaged' as const, asset: a.id, damage: 1, horror: 0 }
  const out = use(s, '60177', t)
  expect(me(out).clues).toBe(1)
  expect(out.assets[a.id]!.exhausted).toBe(true)
  expect(trigger(out, '60177', t)).toEqual([])
  expect(trigger(s, '60177', { ...t, damage: 0, horror: 1 })).toEqual([])
  expect(b('60177').soaksAtLocation).toBe(true)
  expect(b('60177').skillModifier!(s, a, { ...test(s).skillTest!, skill: 'combat' })).toBe(1)
})
it.each(['spend', 'place'])(
  'Press Pass reacts to an actual clue %s and grants this turn or the next turn',
  (mode) => {
    let s = patch({ clues: 2 })(asset('09055'))
    const msg: Message =
      mode === 'spend'
        ? { type: 'SpendClues', investigator: 'a', amount: 2 }
        : { type: 'PlaceCluesOnLocation', investigator: 'a', amount: 2 }
    s = dispatch(s, msg)
    s = choose(s, 'choice.fieldAbility', { card: playerCardDef('09055')!.name })
    expect(me(s).actionsRemaining).toBe(4)
    s = patch({ clues: 1 })({ ...asset('09055'), activeTurn: 'b' })
    s = dispatch(s, { type: 'SpendClues', investigator: 'a', amount: 1 })
    s = choose(s, 'choice.fieldAbility')
    expect(me(s).nextTurnBenefits).toContainEqual({ code: '09055', actions: 1 })
    expect(me(s).actionsRemaining).toBe(3)
  },
)
it('Press Pass ignores zero clues and spending is reported after clues on an asset have actually left it', () => {
  let s = withAsset(asset('09055'), '01033', { clues: 1 })
  s = dispatch(s, { type: 'SpendClues', investigator: 'a', amount: 1 })
  expect(s.assets['01033']!.clues).toBe(0)
  expect(
    s.pending!.question.choices.some((c) => c.params?.card === playerCardDef('09055')!.name),
  ).toBe(true)
  s = dispatch(asset('09055'), { type: 'SpendClues', investigator: 'a', amount: 1 })
  expect(s.pending).toBeNull()
})
it('Nose to the Grindstone boosts a Tool test and offers only missing supplies or a resource on failure', () => {
  let s = withAsset(asset('11111'), 'event-tool', { uses: 1 })
  s = test(s, 20)
  s = { ...s, skillTest: { ...s.skillTest!, source: 'event-tool' } }
  const opts = b('11111').testOptions!(s, s.skillTest!, s.assets['11111']!)
  expect(opts).toHaveLength(1)
  s = dispatch(clean(s), ...opts[0]!.then)
  expect(skillTestValue(s).total).toBe(me(s).skills.intellect + 2)
  s = dispatch(clean(s), {
    type: 'PlayerCardEffect',
    code: '11111',
    investigator: 'a',
    step: 'fail',
    data: { asset: 'event-tool' },
  })
  expect(s.pending!.question.choices.map((c) => c.label)).toContain('choice.eventGain')
  const out = choose(s, 'choice.eventAddUses')
  expect(out.assets['event-tool']!.uses).toBe(2)
})
it.each([1, 2, 3])(
  'Steady-Handed heals only if the adjusted margin is exactly two (initial %i)',
  (margin) => {
    let s = patch({ horror: 2 })(asset('10053'))
    s = test(s, 1)
    s = {
      ...s,
      skillTest: { ...s.skillTest!, baseSkill: margin + 1, baseModifier: 0, tokenModifier: 0 },
    }
    s = use(clean(s), '10053', { type: 'whenWouldSucceed', investigator: 'a' })
    s = choose(s, 'choice.eventMargin', { n: margin === 3 ? -1 : 1 })
    expect(me(s).horror).toBe(margin === 2 ? 2 : 1)
    expect(s.skillTest!.successMarginModifier).toBe(margin === 3 ? -1 : 1)
  },
)
it('Inquisitive belongs to its committer but the performer decides; each copy changes a successful margin once', () => {
  let s = test(start(), 2)
  s = {
    ...s,
    skillTest: {
      ...s.skillTest!,
      baseSkill: 2,
      baseModifier: 0,
      committed: [{ id: 1, code: '11101', by: 'b' }],
    },
  }
  const opts = b('11101').committedReactions!(
    s,
    { type: 'whenWouldSucceed', investigator: 'a' },
    'b',
  )
  expect(opts[0]!.investigator).toBe('a')
  s = dispatch(clean(s), ...opts[0]!.then)
  s = choose(s, 'choice.eventMargin', { n: 2 })
  expect(
    b('11101').committedReactions!(s, { type: 'whenWouldSucceed', investigator: 'a' }, 'b'),
  ).toEqual([])
  expect(
    b('11101').committedReactions!(s, { type: 'whenWouldFail', investigator: 'a' }, 'b'),
  ).toEqual([])
  const out = dispatch(
    { ...clean(s), skillTest: { ...s.skillTest!, tokens: [0] } },
    { type: 'ResolveSkillTest', windowResolved: true },
  )
  expect(out.skillTest!.succeeded).toBe(true)
  expect(out.skillTest!.modifiedSkill).toBe(skillTestValue(s).total + 2)
})
it('Double Down pays up to three resources and gives the committed copy two wild icons per resource', () => {
  let s = test(patch({ hand: ['11107'], resources: 2 })(start()))
  s = dispatch(clean(s), { type: 'CommitCard', investigator: 'a', code: '11107' })
  s = choose(s, 'choice.spendResources', { n: 2 })
  expect(me(s).resources).toBe(0)
  expect(s.skillTest!.committed[0]!.iconBonus?.wild).toBe(4)
  expect(playerCardDef('11107')!.commitLimit).toBe(1)
})
it('Correlate cancels only the first reveal, returns it, and gives two uses only at margin one or three', () => {
  let s = withAsset({ ...start(), interactive: true }, 'event-charge')
  s = play(s, '11040')
  s = choose({ ...s, chaosBag: [0] }, 'choice.revealToken')
  s = choose(s, 'choice.eventCancelToken')
  expect(s.skillTest!.revealCount).toBe(2)
  expect(s.pending!.question.choices.some((c) => c.label === 'choice.eventCancelToken')).toBe(false)
  for (const margin of [0, 1, 2, 3, 4]) {
    let base = withAsset(start(), 'event-charge', { uses: 0 })
    base = test(base)
    base = { ...base, skillTest: { ...base.skillTest!, modifiedSkill: margin + 1, difficulty: 1 } }
    const out = dispatch(clean(base), ...b('11040').effect!(base, 'a', 'uses', {}))
    expect(out.pending!.question.choices[0]!.params?.n).toBe([1, 3].includes(margin) ? 2 : 1)
  }
})
it('success-margin changes clamp to zero and never turn an automatic failure into success', () => {
  let s = test(start(), 3)
  s = {
    ...s,
    skillTest: {
      ...s.skillTest!,
      baseSkill: 3,
      baseModifier: 0,
      tokens: [0],
      successMarginModifier: -2,
    },
  }
  let out = dispatch(clean(s), { type: 'ResolveSkillTest', windowResolved: true })
  expect(out.skillTest!.succeeded).toBe(true)
  expect(out.skillTest!.modifiedSkill).toBe(3)
  s = { ...s, skillTest: { ...s.skillTest!, successMarginModifier: 2, autoFail: true } }
  out = dispatch(clean(s), { type: 'ResolveSkillTest', failWindowResolved: true })
  expect(out.skillTest!.succeeded).toBe(false)
  expect(out.skillTest!.modifiedSkill).toBe(0)
})
it('the next-turn action from Press Pass is actually granted once, even if the current round has ended', () => {
  let s = asset('09055')
  s = dispatch(s, { type: 'NextTurnBenefits', investigator: 'a', actions: 1, code: '09055' })
  s = { ...s, round: s.round + 1 }
  s = dispatch(s, { type: 'BeginTurn', investigator: 'a' })
  expect(me(s).actionsRemaining).toBe(4)
  expect(me(s).nextTurnBenefits ?? []).toEqual([])
})
it('Correlate can cancel the retained token of the initial two-token reveal, but not the replacement', () => {
  let s = play({ ...start(), interactive: true }, '11040')
  s = dispatch(clean(s), { type: 'RevealChaosToken', token: 0, ignored: -1 })
  expect(s.skillTest!.revealCount).toBe(2)
  expect(s.pending!.question.choices.some((c) => c.label === 'choice.eventCancelToken')).toBe(true)
  s = choose(s, 'choice.eventCancelToken')
  expect(
    b('11040').effectReactions!(
      s,
      { type: 'whenRevealChaosToken', investigator: 'a', token: 0 },
      'a',
    ),
  ).toEqual([])
})
