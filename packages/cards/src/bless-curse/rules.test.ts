// RR: Chaos Bag (Bless/Curse tokens), Costs, Fast, Triggered Abilities, Skill Tests ST.2-ST.8,
// Cancel, Enemy Attacks, Uses, Healing.
import { expect, it } from 'vitest'
import {
  availableAbilities,
  playerCardBehavior,
  registerScenario,
  type ChaosToken,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, during, ghoul, labels } from '@lcg/engine/testing'
import { game, patch } from '../dunwich-pilot/testing'
import { setup, name } from '../basic-abilities/testing'
import data from '../data/bless-curse.json'
import './index'

const test = (difficulty = 2, skill = 'willpower'): Message => ({
  type: 'BeginSkillTest',
  investigator: 'a',
  skill: skill as 'willpower',
  difficulty,
  kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
})
const me = (s: GameState) => s.investigators.find((i) => i.id === 'a')!
const count = (s: GameState, token: ChaosToken) => s.chaosBag.filter((t) => t === token).length
const bag =
  (...tokens: ChaosToken[]) =>
  (s: GameState) => ({ ...s, chaosBag: tokens })
const base = (players?: string[]) =>
  during({ ...game(players), interactive: true }, patch({ resources: 5, hand: [] }))
const withHand = (s: GameState, codes: string[], resources = 10) =>
  during(s, patch({ hand: codes, resources }))
const startTest = (s: GameState, difficulty = 2, skill = 'willpower') =>
  during(s, (x) => x, test(difficulty, skill))
const commit = (s: GameState, code: string) => choose(s, 'choice.commit', { card: name(code) })
const reveal = (s: GameState) => choose(s, 'choice.revealToken')
const apply = (s: GameState) => choose(s, 'choice.applyResults')
const playFast = (s: GameState, code: string) =>
  choose(choose(s, 'ability.playFastFor', { card: name(code) }), 'ability.playCard', {
    card: name(code),
  })

it.each(data)('$code has a reviewed implementation', (c) =>
  expect(playerCardBehavior(c.code)).toBeDefined(),
)

it.each(['07034', '10124'])('Keep Faith %s adds 4 bless tokens in a fast window', (code) => {
  let s = startTest(withHand(base(), [code]))
  s = playFast(s, code)
  expect(count(s, 'bless')).toBe(4)
})

it('Tempt Fate adds 3 curse, then 3 bless and draws 1 card', () => {
  let s = withHand(base(), ['07037'])
  s = during(s, patch({ deck: ['01088'] }))
  s = startTest(s)
  s = playFast(s, '07037')
  expect(count(s, 'curse')).toBe(3)
  expect(count(s, 'bless')).toBe(3)
  expect(me(s).hand).toContain('01088')
})

it('Tempt Fate skips everything after then if fewer than three curses can be added', () => {
  let s = withHand(base(), ['07037'])
  s = during(s, patch({ deck: ['01088'] }))
  s = startTest(during(s, bag(...Array<ChaosToken>(8).fill('curse'))))
  s = playFast(s, '07037')
  expect(count(s, 'curse')).toBe(10)
  expect(count(s, 'bless')).toBe(0)
  expect(me(s).hand).not.toContain('01088')
})

it('Keep Faith is unavailable when all ten bless tokens are in play', () => {
  const s = startTest(
    withHand(during(base(), bag(...Array<ChaosToken>(10).fill('bless'))), ['07034']),
  )
  expect(labels(s)).not.toContain('ability.playFastFor')
})

it('Deep Knowledge costs 2 curse tokens and splits 3 draws among investigators here', () => {
  let s = withHand(base(['a', 'b']), ['07023'])
  s = during(s, (x) => ({
    ...patch({ deck: ['01088', '01089', '01090'] })(x),
    investigators: x.investigators.map((i) =>
      i.id === 'b' ? { ...i, hand: [], deck: ['01091', '01092'], location: 'A' } : i,
    ),
  }))
  s = choose(s, 'action.play', { card: name('07023') })
  expect(count(s, 'curse')).toBe(2)
  s = choose(s, 'choice.blessCurseDraw', { name: me(s).name, n: 3 })
  const b = s.investigators.find((i) => i.id === 'b')!
  s = choose(s, 'choice.blessCurseDraw', { name: b.name, n: 2 })
  s = choose(s, 'choice.blessCurseDraw', { name: me(s).name, n: 1 })
  expect(me(s).hand).toHaveLength(2)
  expect(s.investigators.find((i) => i.id === 'b')!.hand).toHaveLength(1)
})

it('Faustian Bargain cannot be played without 2 curse tokens left in the pool', () => {
  const full = withHand(during(base(), bag(...Array<ChaosToken>(9).fill('curse'))), ['07028'])
  expect(labels(full)).not.toContain('action.play')
  let s = withHand(base(), ['07028'], 0)
  s = choose(s, 'action.play', { card: name('07028') })
  expect(count(s, 'curse')).toBe(2)
  expect(me(s).resources).toBe(5)
})

it('Stirring Up Trouble adds curse tokens equal to the shroud and discovers 2 clues', () => {
  let s = withHand(base(), ['07112'])
  s = during(s, (x) => ({
    ...x,
    locations: { ...x.locations, A: { ...x.locations.A!, shroud: 1, shroudModifier: 2, clues: 3 } },
  }))
  s = choose(s, 'action.play', { card: name('07112') })
  expect(count(s, 'curse')).toBe(3)
  expect(me(s).clues).toBe(2)
})

it('Harmony Restored returns curse tokens up to the number of bless tokens and pays for each', () => {
  let s = withHand(during(base(), bag('bless', 'bless', 'curse', 'curse', 'curse', 0)), ['07230'])
  s = choose(s, 'action.play', { card: name('07230') })
  expect(count(s, 'curse')).toBe(1)
  expect(count(s, 'bless')).toBe(2)
  expect(me(s).resources).toBe(10 - 3 + 2)
})

it('Harmony Restored is unavailable without both kinds of token in the bag', () => {
  const s = withHand(during(base(), bag('bless', 0)), ['07230'])
  expect(labels(s)).not.toContain('action.play')
})

it('The Stygian Eye costs 1 less per curse token and gives +3 to each skill this round', () => {
  let s = withHand(during(base(), bag('curse', 'curse', 'curse', 'curse')), ['07263'])
  s = choose(s, 'action.playFast', { card: name('07263') })
  expect(me(s).resources).toBe(10 - 6)
  // Willpower 3 + 3 against 6 succeeds.
  s = apply(reveal({ ...startTest(s, 6), chaosBag: [0] }))
  expect(s.lastSkillTest?.succeeded).toBe(true)
})

it('Control Variable discovers a clue after a curse token is revealed in a test here', () => {
  let s = withHand(base(), ['10046'])
  s = during(s, (x) => ({
    ...x,
    locations: { ...x.locations, A: { ...x.locations.A!, clues: 2 } },
  }))
  s = reveal({ ...startTest(s), chaosBag: ['curse'] })
  s = choose(s, 'ability.playCard', { card: name('10046') })
  expect(me(s).clues).toBe(1)
})

it('Hand of Fate adds bless tokens equal to the enemy’s modified damage plus horror', () => {
  registerScenario({
    id: 'hand-of-fate-test',
    enemyDamageModifier: () => 2,
    enemyHorrorModifier: () => -1,
  })
  let s = during(base(), (x) => ({ ...x, scenarioId: 'hand-of-fate-test' }), {
    type: 'SpawnEnemy',
    card: ghoul,
    location: 'A',
    engageWith: 'a',
  })
  s = withHand(s, ['07020'])
  s = choose(s, 'action.endTurn')
  while (s.pending && !labels(s).includes('ability.playCard')) s = choose(s, labels(s)[0]!)
  s = choose(s, 'ability.playCard', { card: name('07020') })
  expect(me(s).damage + me(s).horror).toBe(0)
  expect(count(s, 'bless')).toBe(3)
})

it('Book of Psalms spends a secret, heals 1 horror here and adds 2 bless tokens', () => {
  let s = setup('07017', { enemy: null })
  s = during(s, patch({ horror: 2 }))
  expect(s.assets['07017']!.uses).toBe(4)
  s = choose(s, 'ability.bookOfPsalms', { card: name('07017') })
  s = choose(s, 'choice.healHorrorOf', { name: me(s).name })
  expect(me(s).horror).toBe(1)
  expect(s.assets['07017']!.uses).toBe(3)
  expect(count(s, 'bless')).toBe(2)
})

it('Spirit of Humanity trades damage and horror for bless, or curse for healing', () => {
  let s = startTest(setup('07229', { enemy: null }))
  s = choose(s, 'ability.spiritBless', { card: name('07229') })
  expect(count(s, 'bless')).toBe(2)
  expect(me(s).damage + me(s).horror).toBeGreaterThan(0)
  let t = during(setup('07229', { enemy: null }), patch({ damage: 1, horror: 1 }))
  t = startTest(t)
  t = choose(t, 'ability.spiritCurse', { card: name('07229') })
  expect(count(t, 'curse')).toBe(2)
  expect([me(t).damage, me(t).horror]).toEqual([0, 0])
})

it('Spirit of Humanity cannot pay damage and horror to add no bless tokens', () => {
  const s = startTest(
    during(setup('07229', { enemy: null }), bag(...Array<ChaosToken>(10).fill('bless'))),
  )
  expect(labels(s)).not.toContain('ability.spiritBless')
})

it('Gabriel Carillo gives +1 intellect and draws a card for a curse token at turn start', () => {
  const s = setup('10052', { enemy: null })
  const options = playerCardBehavior('10052')!.reactions!(
    s,
    { type: 'turnBegins', investigator: 'a' },
    s.assets['10052']!,
  )
  expect(options[0]!.then).toEqual([
    { type: 'AddChaosTokens', tokens: ['curse'], scenarioOnly: true },
    { type: 'DrawCards', investigator: 'a', amount: 1 },
  ])
  expect(
    playerCardBehavior('10052')!.skillModifier!(s, s.assets['10052']!, {
      skill: 'intellect',
    } as never),
  ).toBe(1)
  const full = during(s, bag(...Array<ChaosToken>(10).fill('curse')))
  expect(
    playerCardBehavior('10052')!.reactions!(
      full,
      { type: 'turnBegins', investigator: 'a' },
      full.assets['10052']!,
    ),
  ).toEqual([])
})

it('Scrimshaw Charm adds 1-3 curse tokens and gains 1 resource plus 1 per token', () => {
  let s = setup('10068', { enemy: null })
  const keys = availableAbilities(s, 'a').filter((o) => o.label === 'ability.scrimshaw')
  expect(keys).toHaveLength(3)
  s = choose(s, 'ability.scrimshaw', { card: name('10068'), n: 3, gain: 4 })
  expect(count(s, 'curse')).toBe(3)
  expect(me(s).resources).toBe(9)
  expect(s.assets['10068']!.exhausted).toBe(true)
})

it('Priest of Two Faiths adds 3 bless on entering play; at upkeep end curse or discard', () => {
  const s = setup('07156', { enemy: null })
  const b = playerCardBehavior('07156')!
  const self = s.assets['07156']!
  expect(
    b.reactions!(s, { type: 'afterAssetEntersPlay', investigator: 'a', asset: self.id }, self)[0]!
      .then,
  ).toEqual([{ type: 'AddChaosTokens', tokens: ['bless', 'bless', 'bless'], scenarioOnly: true }])
  const ask = b.forced!(s, { type: 'upkeepPhaseEnds' }, self)[0] as Extract<
    Message,
    { type: 'Ask' }
  >
  expect(ask.question.choices.map((c) => c.label)).toEqual([
    'choice.addCurse',
    'choice.discardCard',
  ])
  const full = during(s, bag(...Array<ChaosToken>(10).fill('curse')))
  expect(b.forced!(full, { type: 'upkeepPhaseEnds' }, self)).toEqual([
    { type: 'DiscardAsset', asset: self.id },
  ])
})

it('Ancestral Token adds bless equal to the defeated enemy printed health, max 5', () => {
  const s = setup('10019', { enemy: null })
  const self = s.assets['10019']!
  const options = playerCardBehavior('10019')!.reactions!(
    s,
    { type: 'enemyDefeated', enemy: { health: 7 } as never, by: 'a' },
    self,
  )
  expect(options[0]!.then).toEqual([
    { type: 'ExhaustAsset', asset: self.id },
    { type: 'AddChaosTokens', tokens: Array(5).fill('bless'), scenarioOnly: true },
  ])
  expect(
    playerCardBehavior('10019')!.reactions!(
      s,
      { type: 'enemyDefeated', enemy: { health: 3 } as never, by: 'b' },
      self,
    ),
  ).toEqual([])
})

it('Ancestral Token uses the per-investigator printed health as its resulting value', () => {
  const s = { ...setup('10019', { enemy: null }), startingInvestigatorCount: 2 }
  const self = s.assets['10019']!
  const options = playerCardBehavior('10019')!.reactions!(
    s,
    { type: 'enemyDefeated', enemy: { health: 2, healthPerInvestigator: true } as never, by: 'a' },
    self,
  )
  expect(options[0]!.params).toMatchObject({ n: 4 })
})

it('Token of Faith adds a bless per curse or auto-fail token revealed in the ended test', () => {
  let s = startTest(setup('07033', { enemy: null }))
  s = apply(reveal({ ...s, chaosBag: ['curse'] }))
  s = choose(s, 'ability.addBless', { card: name('07033'), n: 1 })
  expect(count(s, 'bless')).toBe(1)
  let t = startTest(setup('07033', { enemy: null }))
  t = apply(reveal({ ...t, chaosBag: ['autoFail'] }))
  expect(labels(t)).toContain('ability.addBless')
  expect(s.assets['07033']!.exhausted).toBe(true)
})

// FAQ: "revealed" counts tokens revealed and then ignored or canceled (RR Chaos Tokens).
const revealIgnoring = (s: GameState, kept: ChaosToken, ignored: ChaosToken) => {
  const x = { ...s, chaosBag: [kept, ignored], skillTest: { ...s.skillTest!, chooseToken: 'a' } }
  return apply(choose(reveal(x), 'choice.resolveToken', { token: String(kept) }))
}

it('Token of Faith counts a curse token revealed and then ignored', () => {
  const s = revealIgnoring(startTest(setup('07033', { enemy: null })), 0, 'curse')
  const t = choose(s, 'ability.addBless', { card: name('07033'), n: 1 })
  expect(count(t, 'bless')).toBe(1)
})

it('Promise of Power adds a curse token, or 2 horror when none is left', () => {
  let s = startTest(withHand(base(), ['07032']))
  s = commit(s, '07032')
  expect(count(s, 'curse')).toBe(1)
  let t = startTest(
    withHand(during(base(), bag(...Array<ChaosToken>(10).fill('curse'))), ['07032']),
  )
  t = commit(t, '07032')
  expect(me(t).horror).toBe(2)
})

it('Predestined commits to any test and, on failure, adds 2 bless or removes 2 curse', () => {
  let s = startTest(withHand(during(base(), bag('curse', 'curse', -8)), ['07035']), 2)
  s = commit(s, '07035')
  s = apply(reveal({ ...s, chaosBag: [-8] }))
  s = choose(s, 'choice.removeCurse', { n: 2 })
  expect(count(s, 'curse')).toBe(0)
})

it('Signum Crucis only commits above your base skill and adds the difference in bless', () => {
  const low = startTest(withHand(base(), ['07197']), 1)
  expect(labels(low)).not.toContain('choice.commit')
  let s = startTest(withHand(base(), ['07197']), 6)
  const diff = 6 - me(s).skills.willpower
  s = commit(s, '07197')
  expect(count(s, 'bless')).toBe(diff)
})

it('Justify the Means adds curse equal to the difficulty and the test succeeds', () => {
  let s = startTest(withHand(base(), ['07306']), 4)
  s = commit(s, '07306')
  expect(count(s, 'curse')).toBe(4)
  expect(s.skillTest!.autoSucceed).toBe(true)
  const full = startTest(
    withHand(during(base(), bag(...Array<ChaosToken>(8).fill('curse'))), ['07306']),
    4,
  )
  expect(labels(full)).not.toContain('choice.commit')
})

it('Purified adds bless or removes curse per point succeeded by, up to 5', () => {
  // Willpower 3 against 1 succeeds by 2: one removal and one addition.
  let s = startTest(withHand(base(), ['10029']), 1)
  s = commit(s, '10029')
  s = reveal({ ...s, chaosBag: [0] })
  s = apply({ ...s, chaosBag: ['curse'] })
  s = choose(s, 'choice.removeCurse', { n: 1 })
  s = choose(s, 'choice.addBless', { n: 1 })
  expect([count(s, 'bless'), count(s, 'curse')]).toEqual([1, 0])
})

// Rules Forum (September 2024): "you" is the investigator who committed Purified.
it('Purified gives no effect when committed to another investigator’s test', () => {
  let s = during(base(['a', 'b']), patch({ hand: ['10029'], location: 'A' }, 'b'))
  s = startTest(s, 1)
  s = choose(s, 'choice.commitFrom', { card: name('10029') })
  s = commit(s, '10029')
  s = apply(reveal({ ...s, chaosBag: [0] }))
  expect(labels(s)).not.toContain('choice.addBless')
  expect(count(s, 'bless')).toBe(0)
})

it('Esoteric Method adds a curse per point succeeded or failed by after the test', () => {
  let s = startTest(withHand(base(), ['10055']), 1)
  s = commit(s, '10055')
  s = apply(reveal({ ...s, chaosBag: [0] }))
  // Willpower 3 + 4 wild icons = 7 against 1: succeeds by 6.
  expect(count(s, 'curse')).toBe(me(s).skills.willpower + 4 - 1)
})

it('Accursed adds up to 3 curse tokens and treats each curse modifier as 0', () => {
  let s = startTest(withHand(base(), ['10095']), 4)
  s = commit(s, '10095')
  s = choose(s, 'choice.addCurse', { n: 2 })
  expect(count(s, 'curse')).toBe(2)
  s = reveal({ ...s, chaosBag: ['curse'] })
  expect(s.skillTest!.tokenModifier).toBe(0)
})

it('Skeptic treats bless and curse modifiers as +1, and they return to the pool', () => {
  let s = startTest(withHand(base(), ['07115']), 4)
  s = commit(s, '07115')
  s = reveal({ ...s, chaosBag: ['curse'] })
  expect(s.skillTest!.tokenModifier).toBe(1)
  s = apply(s)
  expect(s.chaosBag).toEqual([])
})

it('Fey may return to hand when a curse token was revealed in its test', () => {
  let s = startTest(withHand(base(), ['07222']), 1)
  s = commit(s, '07222')
  s = apply(reveal({ ...s, chaosBag: ['curse'] }))
  s = choose(s, 'choice.returnToHand', { card: name('07222') })
  expect(me(s).hand).toContain('07222')
  let t = startTest(withHand(base(), ['07222']), 1)
  t = apply(reveal({ ...commit(t, '07222'), chaosBag: [0] }))
  expect(me(t).discard).toContain('07222')
})

it('Fey may return to hand when a curse token was revealed and then ignored', () => {
  let s = startTest(withHand(base(), ['07222']), 1)
  s = revealIgnoring(commit(s, '07222'), 0, 'curse')
  s = choose(s, 'choice.returnToHand', { card: name('07222') })
  expect(me(s).hand).toContain('07222')
})

it('Providential adds bless equal to the lower of your damage and horror on success', () => {
  let s = startTest(withHand(during(base(), patch({ damage: 3, horror: 2 })), ['10125']), 1)
  s = commit(s, '10125')
  s = apply(reveal({ ...s, chaosBag: [0] }))
  expect(count(s, 'bless')).toBe(2)
})
