// RR: Modifiers, Skill Icons, Multi-class Cards, Permanent, Then, Massive.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  playerCardDef,
  registerScenario,
  type GameState,
  type SkillType,
} from '@lcg/engine'
import { choose, ghoul } from '@lcg/engine/testing'
import { game, me, patch, withAsset } from './dunwich-pilot/testing'
import { commit, icons, open } from './skill-tricks/testing'
import './index'

const start = () =>
  patch({ hand: [], resources: 10 })({ ...game(['a', 'b']), pending: null, queue: [] })
const massive = (s: GameState): GameState => ({
  ...s,
  enemies: {
    foe: {
      ...ghoul,
      id: 'foe',
      location: 'A',
      engagedWith: null,
      keywords: ['massive'],
      exhausted: false,
      damageTaken: 0,
      maxHealth: 5,
      doom: 0,
    },
  },
})

it.each([
  ['08024', 'combat', 'agility'],
  ['08037', 'intellect', 'agility'],
  ['08065', 'willpower', 'intellect'],
  ['08078', 'willpower', 'combat'],
] as const)(
  '%s counts modified attributes and has no icons in the discard pile',
  (code, tested, other) => {
    const s = open(tested, [code], {
      skills: { willpower: 2, intellect: 2, combat: 2, agility: 2 },
      phaseSkillBonuses: [{ skill: other, amount: 2, code, phase: 'investigation', round: 1 }],
    })
    expect(icons(commit(s, code))).toBe(4)
    expect(playerCardBehavior(code)!.additionalIcons!(s, s.skillTest!, 'a', 'discard')).toEqual({})
  },
)

it('Savant uses modified attributes, excluding the tested attribute and committed icons', () => {
  const s = withAsset(
    open('combat', ['08052'], { skills: { willpower: 4, intellect: 2, combat: 1, agility: 4 } }),
    '01033',
  )
  expect(icons(commit(s, '08052'))).toBe(4)
})

it('Do-or-Die recovers a Survivor multiclass asset, but not a skill or an unrelated class', () => {
  let s = patch({ discard: ['05117', '01093', '01060'] })(start())
  s = dispatch(s, { type: 'PlayerCardEffect', investigator: 'a', code: '60568', step: 'recover' })
  expect(me(s).hand).toContain('05117')
  expect(me(s).discard).toEqual(['01093', '01060'])
})

it('Sacrifice accepts a Mystic multiclass asset and resolves all three gains', () => {
  let s = withAsset(start(), '08090')
  expect(playerCardBehavior('04234')!.canPlay!(s, 'a')).toBe(true)
  s = dispatch(s, ...playerCardBehavior('04234')!.play!(s, 'a'))
  for (let n = 0; n < 3; n++) s = choose(s, 'choice.eventResources', { n: 1 })
  expect(s.assets['08090']).toBeUndefined()
  expect(me(s).resources).toBe(13)
})

it('Sacrifice cannot discard a permanent Mystic asset to obtain its Then reward', () => {
  const s = withAsset(start(), '02191')
  expect(playerCardDef('02191')!.class).toBe('mystic')
  expect(playerCardBehavior('04234')!.canPlay!(s, 'a')).toBe(false)
  expect(playerCardBehavior('04234')!.play!(s, 'a')).toEqual([])
})

it('Eavesdrop cannot select a ready Massive enemy considered engaged with investigators here', () => {
  const s = massive(start())
  expect(playerCardBehavior('04027')!.canPlay!(s, 'a')).toBe(false)
  expect(
    playerCardBehavior('04027')!.canPlay!(
      { ...s, enemies: { foe: { ...s.enemies.foe!, exhausted: true } } },
      'a',
    ),
  ).toBe(true)
})

it('Blackjack 2 gets its extra damage against a ready Massive enemy engaged with another investigator', () => {
  const s = withAsset(massive(start()), '51002')
  const option = playerCardBehavior('51002')!.abilities!(s, s.assets['51002']!, 'a')[0]!
  const test = option.then.find((m) => m.type === 'BeginSkillTest')!
  expect(test.type === 'BeginSkillTest' && test.kind).toMatchObject({
    type: 'fight',
    extraDamage: 1,
  })
  const alone = patch({ location: 'B' }, 'b')(s)
  const other = playerCardBehavior('51002')!.abilities!(alone, alone.assets['51002']!, 'a')[0]!
  expect(other.then.find((m) => m.type === 'BeginSkillTest')).toMatchObject({
    kind: { extraDamage: 0 },
  })
})

it('If it bleeds heals the modified horror value of the defeated Monster', () => {
  registerScenario({ id: 'review-remaining-horror', enemyHorrorModifier: () => 2 })
  let s = {
    ...patch({ horror: 4 })(patch({ horror: 4 }, 'b')(start())),
    scenarioId: 'review-remaining-horror',
  }
  const target = { ...massive(s).enemies.foe!, horror: 1, traits: ['Monster'] }
  const reaction = playerCardBehavior('02225')!.handReactions!(
    s,
    { type: 'enemyDefeated', enemy: target, by: 'a' },
    'a',
  )[0]!
  s = dispatch(patch({ hand: ['02225'] })(s), ...reaction.then)
  expect(s.investigators.map((i) => i.horror)).toEqual([1, 1])
})

it.each([
  ['03194', 'agility'],
  ['60312', 'agility'],
  ['60323', 'agility'],
  ['04232', 'intellect'],
  ['60314', 'intellect'],
  ['60324', 'intellect'],
  ['06201', 'willpower'],
  ['10102', 'willpower'],
  ['08023', 'agility'],
  ['11055', 'combat'],
  ['12050', 'agility'],
  ['12070', 'willpower'],
  ['09074', 'agility'],
  ['60376', 'intellect'],
  ['60377', 'willpower'],
  ['60378', 'combat'],
] as [string, SkillType][])('%s adds the modified secondary attribute', (code, skill) => {
  let s = massive(start())
  s = patch({
    skills: { willpower: 2, intellect: 2, combat: 2, agility: 2 },
    hand: ['01093'],
    phaseSkillBonuses: [{ skill, amount: 2, code, phase: s.phase, round: s.round }],
  })(s)
  s = dispatch(s, ...playerCardBehavior(code)!.play!(s, 'a'))
  if (!s.skillTest) s = choose(s, 'choice.enemy', { enemy: 'Ghoul' })
  expect(s.skillTest!.baseModifier).toBe(4)
})

it.each(['52006', '03268'])('%s adds modified willpower when evading', (code) => {
  const s = withAsset(withAsset(massive(start()), code), '01059')
  const base = me(s).skills.willpower
  const option = playerCardBehavior(code)!.abilities!(s, s.assets[code]!, 'a')[0]!
  expect(option.then.find((m) => m.type === 'BeginSkillTest')).toMatchObject({ modifier: base + 1 })
})

it.each(['08025', '08030'])('%s adds modified agility on the second attack', (code) => {
  let s = withAsset(withAsset(massive(patch({ hand: ['01093'] })(start())), code), '04196')
  const base = me(s).skills.agility
  s = dispatch(s, {
    type: 'PlayerCardEffect',
    code,
    investigator: 'a',
    step: 'again',
    data: { asset: code, won: true },
  })
  s = choose(s, 'choice.fightAgain', { enemy: 'Ghoul' })
  expect(s.skillTest!.baseModifier).toBe(base + 1)
})

it.each(['01040', '01540', '60270', '12034', '01030', '01530'])(
  '%s boosts intellect investigations, not willpower',
  (code) => {
    const s = withAsset(open('willpower', ['01093']), code)
    const test = { ...s.skillTest!, kind: { type: 'investigate' as const, location: 'A' } }
    const modifier = playerCardBehavior(code)!.skillModifier!
    expect(modifier(s, s.assets[code]!, test)).toBe(0)
    expect(modifier(s, s.assets[code]!, { ...test, skill: 'intellect' })).toBe(1)
  },
)

it('Sneak Attack 2 cannot damage a ready Massive enemy engaged with its player', () => {
  const s = massive(start())
  expect(playerCardBehavior('03152')!.canPlay!(s, 'a')).toBe(false)
  expect(
    playerCardBehavior('03152')!.canPlay!(
      { ...s, enemies: { foe: { ...s.enemies.foe!, exhausted: true } } },
      'a',
    ),
  ).toBe(true)
})

it.each(['01070', '01570', '03154'])(
  '%s never converts its charge into a secret on Feed the Mind',
  (code) => {
    const s = withAsset(withAsset(withAsset(start(), code), '60209'), '01060')
    const options = playerCardBehavior(code)!.abilities!(s, s.assets[code]!, 'a')
    expect(options.map((o) => (o.target?.type === 'asset' ? o.target.id : null))).toEqual(['01060'])
  },
)

it('Loner excludes locations with enemies even when no investigator is there', () => {
  const before = withAsset(start(), '60557')
  const options = playerCardBehavior('60557')!.abilities!(before, before.assets['60557']!, 'a')
  expect(options.some((o) => o.target?.type === 'location' && o.target.id === 'B')).toBe(true)
  const s = massive(before)
  s.enemies.foe = { ...s.enemies.foe!, location: 'B', exhausted: true }
  expect(
    playerCardBehavior('60557')!.abilities!(s, s.assets['60557']!, 'a').some(
      (o) => o.target?.type === 'location' && o.target.id === 'B',
    ),
  ).toBe(false)
})

it('Cornered cannot gain a bonus when the only card in hand is a weakness', () => {
  const s = withAsset(open('combat', ['01015']), '04160')
  expect(playerCardDef('01015')!.weakness).toBeTruthy()
  expect(playerCardBehavior('04160')!.testOptions!(s, s.skillTest!, s.assets['04160']!)).toEqual([])
})

it('Prophetic can boost the test of a Spirit event whose source is its card code', () => {
  let s = withAsset(massive(patch({ hand: ['60111', '01093'] })(start())), '08120')
  s = dispatch(s, { type: 'PlayCard', investigator: 'a', code: '60111' })
  if (!s.skillTest) s = choose(s, 'choice.enemy', { enemy: 'Ghoul' })
  expect(s.skillTest!.source).toBe('60111')
  expect(
    playerCardBehavior('08120')!.testOptions!(s, s.skillTest!, s.assets['08120']!),
  ).toHaveLength(1)
})

it('Hypnotic Gaze reflects the modified damage value of the attacker', () => {
  registerScenario({ id: 'review-remaining-damage', enemyDamageModifier: () => 2 })
  let s: GameState = {
    ...massive(patch({ hand: ['02153'] })(start())),
    scenarioId: 'review-remaining-damage',
    chaosBag: ['skull'],
  }
  const reaction = playerCardBehavior('02153')!.handReactions!(
    s,
    { type: 'whenEnemyAttacks', enemy: 'foe', investigator: 'a' },
    'a',
  )[0]!
  s = dispatch(s, ...reaction.then)
  expect(s.enemies.foe!.damageTaken).toBe(3)
})

it('Old Keyring 3 uses the final difficulty after Momentum, not just shroud minus two', () => {
  let s = withAsset(start(), '09117')
  s = { ...s, locations: { ...s.locations, A: { ...s.locations.A!, shroud: 3, clues: 3 } } }
  s = patch({
    skills: { willpower: 5, intellect: 5, combat: 5, agility: 5 },
    nextTestDifficulty: { amount: 1, phase: s.phase, round: s.round },
  })(s)
  const option = playerCardBehavior('09117')!.abilities!(s, s.assets['09117']!, 'a')[0]!
  s = dispatch(s, ...option.then)
  expect(me(s).clues).toBe(2)
  expect(s.assets['09117']!.uses).toBe(2)
})

it('Indomitable remembers where the attack occurred after the attacked investigator moves', () => {
  let s = massive(start())
  s = dispatch(s, { type: 'EnemyAttack', investigator: 'a', enemy: 'foe', exhaustAfter: false })
  s = patch({ location: 'B' })(s)
  const test = { ...open('combat', []).skillTest!, investigator: 'b' }
  expect(playerCardBehavior('60180')!.additionalIcons!(s, test, 'b')).toEqual({ wild: 3 })
  const moved = patch({ location: 'B' }, 'b')(s)
  expect(playerCardBehavior('60180')!.additionalIcons!(moved, test, 'b')).toEqual({})
})
