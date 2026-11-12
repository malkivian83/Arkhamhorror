// RR: Skill Tests ST.1–ST.8, Uses, Ignore/Cancel, Delayed Effects, Equipment Slots.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  playerCardDef,
  registerPlayerCards,
  registerTreachery,
  skillTestValue,
  usesLenders,
  type ChaosToken,
  type GameState,
  type Message,
  type SkillTestKind,
  type SkillType,
  type Trigger,
} from '@lcg/engine'
import { choose, ghoul, labels, spawnAt } from '@lcg/engine/testing'
import { game, patch, withAsset, me } from '../dunwich-pilot/testing'
import { cardName } from './common'
import data from '../data/advanced-tests.json'
import './index'

const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const base = () => ({
  ...patch({ resources: 10, hand: [] })(clear(game(['a', 'b']))),
  interactive: true,
})
const own = (code: string) => withAsset(base(), code)
const test = (skill: SkillType = 'willpower', kind?: SkillTestKind): Message => ({
  type: 'BeginSkillTest',
  investigator: 'a',
  skill,
  difficulty: 2,
  kind: kind ?? {
    type: 'effect',
    source: 'advanced-test',
    onSuccess: [],
    onFail: [],
    onFailEach: [],
  },
})
const begin = (s: GameState, m: Message = test()) => dispatch(clear(s), m)
const react = (s: GameState, code: string) =>
  choose(s, 'ability.advancedTest', { card: cardName(code) })
const play = (s: GameState, code: string) => choose(s, 'ability.playCard', { card: cardName(code) })
const reveal = (s: GameState, token: ChaosToken = 0) =>
  choose({ ...s, chaosBag: [token] }, 'choice.revealToken')
const apply = (s: GameState) => choose(s, 'choice.applyResults')
const behavior = (c: string) => playerCardBehavior(c)!
it('a replacement base for the test overrides the investigator base raised by Red-Gloved Man', () => {
  const s = withAsset(own('07225'), '02310', { form: 'willpower' })
  expect(skillTestValue(begin(s)).base).toBe(6)
  const changed = react(begin(s), '07225')
  expect(skillTestValue(changed).base).toBe(5)
})
const reactions = (s: GameState, code: string, t: Trigger) =>
  behavior(code).reactions!(s, t, s.assets[code]!)
it.each(data)('$code registers its reviewed behavior once', (c) =>
  expect(behavior(c.code)).toBeDefined(),
)

it('Red-Gloved Man chooses exactly two skills, raises their bases and is discarded after Mythos', () => {
  let s = own('02310')
  s = dispatch(s, {
    type: 'Forced',
    trigger: { type: 'afterAssetEntersPlay', investigator: 'a', asset: '02310' },
  })
  s = react(s, '02310')
  s = choose(s, 'skill.willpower')
  expect(labels(s)).not.toContain('skill.willpower')
  s = choose(s, 'skill.intellect')
  expect(skillTestValue(begin(s)).base).toBe(6)
  expect(skillTestValue(begin(s, test('combat'))).base).toBe(me(s).skills.combat)
  s = dispatch(clear(s), { type: 'Forced', trigger: { type: 'mythosPhaseEnds' } })
  expect(s.assets['02310']).toBeUndefined()
  expect(me(s).discard).toContain('02310')
})

it('Djinn sets base 5 without changing skill or modifiers and readies on a resolved blessing', () => {
  let s = react(begin(own('07225'), { ...test('intellect'), modifier: 2 } as Message), '07225')
  expect(s.skillTest).toMatchObject({ baseSkill: 5, skill: 'intellect', baseModifier: 2 })
  expect(s.assets['07225']!.exhausted).toBe(true)
  s = reveal(s, 'bless')
  expect(s.assets['07225']!.exhausted).toBe(false)
})

it('Djinn grants at most one optional action for any number of resolved curses, even if it leaves play', () => {
  let s = react(begin(own('07225')), '07225')
  s = dispatch(clear(s), { type: 'RemoveAssetFromGame', asset: '07225' })
  s = dispatch(
    { ...clear(s), chaosBag: ['curse', 'curse', 0] },
    { type: 'RevealChaosToken', token: 'curse', search: true },
  )
  s = choose(s, 'choice.gainAction')
  expect(me(s).actionsRemaining).toBe(4)
  expect(s.skillTest!.tokens.filter((t) => t === 'curse').length).toBe(2)
})

it('Pnakotic Manuscripts reserves a tokenless next test only through this round', () => {
  let s = dispatch(own('04307'), { type: 'SkipNextRoundTestTokens', investigator: 'b' })
  const next = begin(s, { ...test(), investigator: 'b' } as Message)
  expect(next.skillTest!.noTokens).toBe(true)
  expect(next.investigators[1]!.noTokensNextRoundTest).toBeUndefined()
  s = begin({ ...s, round: s.round + 1 }, { ...test(), investigator: 'b' } as Message)
  expect(s.skillTest!.noTokens).toBeUndefined()
})

const trial = {
  code: 'advanced-treachery',
  name: 'Advanced Treachery',
  kind: 'treachery' as const,
  keywords: [],
}
registerTreachery({
  code: trial.code,
  revelation: (_s, who) => [
    {
      ...test(),
      investigator: who,
      kind: { type: 'effect', source: trial.name, onSuccess: [], onFail: [], onFailEach: [] },
    } as Message,
  ],
})
it('Pnakotic Manuscripts reacts during a real revelation and spends a secret without exhausting', () => {
  let s = dispatch(own('04307'), { type: 'ResolveEncounterCard', investigator: 'b', card: trial })
  s = react(s, '04307')
  expect(s.skillTest!.revelation).toBeDefined()
  expect(s.skillTest!.noTokens).toBe(true)
  expect(s.assets['04307']).toMatchObject({ uses: 2, exhausted: false })
})

it('Holy Rosary requires a successful own willpower test on a treachery and adds two blessings', () => {
  let s = dispatch(own('07220'), { type: 'ResolveEncounterCard', investigator: 'a', card: trial })
  expect(s.skillTest!.onTreachery).toBeDefined()
  expect(skillTestValue(s).passive).toBe(1)
  s = reveal(s)
  s = react(s, '07220')
  expect(s.chaosBag.filter((t) => t === 'bless')).toHaveLength(2)
  expect(s.assets['07220']!.exhausted).toBe(true)
  const ordinary = begin(own('07220'))
  expect(
    reactions(ordinary, '07220', {
      type: 'afterSkillTest',
      investigator: 'a',
      kind: 'effect',
      succeeded: true,
      margin: 2,
    } as Trigger),
  ).toEqual([])
})

it('Seal of the Elder Sign resolves its virtual symbol without adding a physical token to the bag', () => {
  let s = begin(patch({ hand: ['03312'] })(base()))
  s = choose(s, 'choice.commit', { card: cardName('03312') })
  s = reveal(s, -4)
  expect(s.skillTest!.tokens).toEqual(['elderSign'])
  s = apply(s)
  expect(s.chaosBag).toEqual([-4])
  expect(me(s).discard).not.toContain('03312')
  expect(me(s).hand).not.toContain('03312')
})

it('Scrying Mirror reveals before committing and the normal reveal step does not draw again', () => {
  let s = react(begin({ ...own('60406'), chaosBag: [0] }), '60406')
  expect(s.skillTest!.tokens).toEqual([0])
  expect(s.skillTest!.earlyRevealDone).toBe(true)
  expect(s.assets['60406']).toMatchObject({ exhausted: true, uses: 3 })
  s = reveal(s, -4)
  expect(s.skillTest!.tokens).toEqual([0])
  expect(s.chaosBag).toEqual([-4])
})

it.each([
  ['06241', 'combat', 'fight'],
  ['06242', 'agility', 'evade'],
  ['06243', 'intellect', 'investigate'],
] as const)(
  '%s ignores willpower substitution, keeps effect bonuses, and boosts its printed skill',
  (code, skill, kind) => {
    const k: SkillTestKind =
      kind === 'investigate' ? { type: kind, location: 'A' } : { type: kind, enemy: 'e' }
    let s = begin(own(code), { ...test('willpower', k), modifier: 2 } as Message)
    s = choose(s, 'ability.advancedUse' + skill[0]!.toUpperCase() + skill.slice(1))
    expect(s.skillTest).toMatchObject({ skill, baseModifier: 2 })
    s = react(s, code)
    expect(s.skillTest!.baseModifier).toBe(4)
    expect(s.assets[code]!.exhausted).toBe(true)
    expect(behavior(code).testOptions!(s, s.skillTest!, s.assets[code]!)).toEqual([])
  },
)

it('all three Empower Self variants occupy one arcane slot, with one copy of each per deck', () => {
  let s = own('06241')
  s = withAsset(withAsset(s, '06242'), '06243')
  s = dispatch(
    s,
    { type: 'PutAssetIntoPlay', investigator: 'a', code: '01060' },
    { type: 'CheckSlots', investigator: 'a' },
  )
  expect(s.pending).toBeNull()
  expect(Object.values(s.assets).map((a) => a.code)).toEqual(
    expect.arrayContaining(['06241', '06242', '06243', '01060']),
  )
  for (const code of ['06241', '06242', '06243']) expect(playerCardDef(code)!.deckLimit).toBe(1)
})

it.each(['02230', '07307'])(
  '%s ignores a held token without returning it early and applies its printed cost',
  (code) => {
    let s = reveal(begin(own(code)), -2)
    s = react(s, code)
    // The next draw is deterministic with only the newly added curse (level 3) or supplied 0.
    expect(s.skillTest!.ignoredTokens).toContain(-2)
    expect(me(s).resources).toBe(code === '02230' ? 8 : 10)
  },
)

it('Lucky Dice (2) leaves play on its replacement autofail before token-cancellation reactions', () => {
  let s = reveal(begin(own('02230')), -2)
  s = react({ ...s, chaosBag: ['autoFail'] }, '02230')
  expect(s.assets['02230']).toBeUndefined()
  expect(me(s).discard).not.toContain('02230')
  expect(s.skillTest!.autoFail).toBe(true)
  expect(s.skillTest!.ignoredTokens).toEqual([-2])
})

it('Lucky Dice (3) returns to hand when its replacement is curse or autofail', () => {
  let s = reveal(begin(own('07307')), -2)
  s = react({ ...s, chaosBag: ['autoFail'] }, '07307')
  expect(s.assets['07307']).toBeUndefined()
  expect(me(s).hand).toContain('07307')
})

it('Third Time is a Charm permits two cancellations and returns each token before the redraw', () => {
  let s = play(begin(patch({ hand: ['07161'] })(base())), '07161')
  s = reveal(s, -2)
  expect(s.skillTest!.tokenRetries).toBe(2)
  s = choose(s, 'ability.testRetry')
  expect(s.skillTest!.tokenRetries).toBe(1)
  s = choose(s, 'ability.testRetry')
  expect(s.skillTest!.tokenRetries).toBe(0)
  expect(labels(s)).not.toContain('ability.testRetry')
})

it.each([
  [-3, 3, false],
  ['skull', 0, true],
  ['autoFail', 0, true],
] as const)(
  'Hit me adds %s and reverses negative numbers while skull automatically fails',
  (token, modifier, fails) => {
    let s = reveal(begin(patch({ hand: ['08112'] })(base())), 0)
    s = play({ ...s, chaosBag: [token] }, '08112')
    expect(s.skillTest!.tokens).toEqual([0, token])
    if (typeof token === 'number') expect(s.skillTest!.tokenModifier).toBe(modifier)
    expect(s.skillTest!.autoFail).toBe(fails)
  },
)

it.each(['03304', '52002'])(
  '%s pays additional Firearm ammo and chooses a token from the complete revealed group',
  (code) => {
    let s = patch({ hand: [code] })(withAsset(base(), '01016'))
    s = dispatch(s, spawnAt('A', { ...ghoul, health: 9 }, 'a'))
    const enemy = Object.keys(s.enemies)[0]!
    s = begin(s, { ...test('combat', { type: 'fight', enemy }), source: '01016' } as Message)
    s = play(s, code)
    s = choose(s, 'choice.advancedExtraAmmo', { n: 1 })
    expect(s.assets['01016']!.uses).toBe(3)
    s = choose({ ...s, chaosBag: [-3, 0] }, 'choice.revealToken')
    s = choose(s, 'choice.resolveToken', { token: '0' })
    expect(s.skillTest!.tokens).toEqual([0])
    expect(s.skillTest!.ignoredTokens).toEqual([-3])
  },
)

it('Uncanny Specimen cancels a local symbol, discards itself and draws for its owner only on success', () => {
  let s = reveal(begin(own('11039')), 'skull')
  const hand = me(s).hand.length
  s = react({ ...s, chaosBag: [0, 0, 0] }, '11039')
  expect(s.assets['11039']).toBeUndefined()
  expect(s.skillTest!.tokens).toEqual([0])
  s = apply(s)
  expect(me(s).hand).toHaveLength(hand + 1)
})

it('three Uncanny Specimens share one arcane slot', () => {
  let s = own('11039')
  s = withAsset(withAsset(s, '11039', { id: 'copy2' }), '11039', { id: 'copy3' })
  s = dispatch(
    s,
    { type: 'PutAssetIntoPlay', investigator: 'a', code: '01060' },
    { type: 'CheckSlots', investigator: 'a' },
  )
  expect(s.pending).toBeNull()
  expect(Object.values(s.assets)).toHaveLength(4)
})

it('Oculus Mortuum gains evidence from a real seal and spends it to discover a clue during a Geist attack', () => {
  let s = dispatch(
    { ...own('11038'), chaosBag: [0] },
    {
      type: 'SealToken',
      investigator: 'a',
      code: '11038',
      token: 0,
      holder: { type: 'asset', id: '11038' },
    },
  )
  s = react(s, '11038')
  expect(s.assets['11038']!.uses).toBe(1)
  s = { ...clear(s), assets: { ...s.assets, '11038': { ...s.assets['11038']!, exhausted: false } } }
  s = dispatch(s, spawnAt('A', { ...ghoul, health: 9, traits: ['Geist'] }, 'b'))
  const enemy = Object.keys(s.enemies)[0]!
  s = dispatch(s, { type: 'EnemyAttack', enemy, investigator: 'b', exhaustAfter: false })
  const clues = me(s).clues
  s = react(s, '11038')
  expect(me(s).clues).toBe(clues + 1)
  expect(s.enemies[enemy]!.damageTaken).toBe(1)
  expect(s.assets['11038']).toMatchObject({ uses: 0, exhausted: true })
})

registerPlayerCards([
  {
    code: 'advanced-spell',
    name: 'Spell test',
    type: 'event',
    class: 'mystic',
    traits: ['Spell'],
    cost: 0,
    icons: {},
  },
])
it('Forbidden Sutra boosts tests on Spell events and pays horror for additional token choice', () => {
  let s = begin(own('11103'), { ...test(), effectSource: 'advanced-spell' } as Message)
  expect(skillTestValue(s).passive).toBe(1)
  s = choose(s, 'ability.advancedHorror', { n: 2 })
  expect(me(s).horror).toBe(2)
  s = choose({ ...s, chaosBag: [-3, -2, 0] }, 'choice.revealToken')
  s = choose(s, 'choice.resolveToken', { token: '0' })
  expect(s.skillTest!.ignoredTokens).toHaveLength(2)
  expect(behavior('11103').requiredInvestigatorTraits).toEqual(['Blessed', 'Cursed', 'Sorcerer'])
})

it.each(['10020', '10033'])(
  '%s lends supplies as ammunition and the upgrade boosts the pending test when its supply is spent',
  (code) => {
    let s = withAsset(own(code), '01016', { uses: 0 })
    expect(usesLenders(s, s.assets['01016']!).map((a) => a.code)).toEqual([code])
    s = dispatch(s, spawnAt('A', { ...ghoul, health: 9 }, 'a'))
    const enemy = Object.keys(s.enemies)[0]!
    s = dispatch(s, { type: 'SpendUses', asset: '01016', amount: 1 }, {
      ...test('combat', { type: 'fight', enemy }),
      source: '01016',
    } as Message)
    if (code === '10033') s = react(s, code)
    expect(s.assets[code]!.uses).toBe(code === '10033' ? 3 : 2)
    expect(s.assets['01016']!.uses).toBe(0)
    expect(s.skillTest!.baseModifier).toBe(code === '10033' ? 2 : 0)
  },
)
