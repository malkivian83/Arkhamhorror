// RR: Chaos Bag, Triggered Abilities ("when … would reveal"), Ignore, Skill Tests ST.3-ST.8,
// Fight, Damage (simultaneous), Uses, Automatic Failure.
import { expect, it } from 'vitest'
import {
  availableAbilities,
  playerCardBehavior,
  playerCardDef,
  type ChaosToken,
  type EnemyCard,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, during, ghoul, labels, spawnAt } from '@lcg/engine/testing'
import { patch, withAsset } from '../dunwich-pilot/testing'
import { setup, fight, investigate, resolve, sturdy, name } from '../basic-abilities/testing'
import data from '../data/token-reveals.json'
import en from './source-en.json'
import es from './source-es.json'
import { bustReward, bustTotals } from './draws'
import './index'

const test = (difficulty = 2): Message => ({
  type: 'BeginSkillTest',
  investigator: 'a',
  skill: 'willpower',
  difficulty,
  kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
})
const bag = (s: GameState, ...tokens: ChaosToken[]) => ({ ...s, chaosBag: tokens })
const startTest = (s: GameState, difficulty = 2) => during(s, (x) => x, test(difficulty))
const reveal = (s: GameState) => choose(s, 'choice.revealToken')
const pick = (s: GameState, token: ChaosToken) =>
  choose(s, 'choice.resolveToken', { token: String(token) })
const apply = (s: GameState) => choose(s, 'choice.applyResults')
const me = (s: GameState) => s.investigators.find((i) => i.id === 'a')!
const inHand = (s: GameState, code: string, resources = 10) =>
  during(s, patch({ hand: [code], resources }))
const sorted = (tokens: ChaosToken[]) => tokens.map(String).sort()

it.each(data)('$code has a reviewed implementation', (c) =>
  expect(playerCardBehavior(c.code)).toBeDefined(),
)

it.each([
  ['01071', 4],
  ['01571', 4],
  ['60421', 3],
])(
  'Grotesque Statue %s reveals 2 tokens, resolves the chosen one and ignores the other',
  (code, charges) => {
    let s = startTest(setup(code, { enemy: null }))
    expect(s.assets[code]!.uses).toBe(charges)
    s = choose(s, 'ability.tokenRevealReplace', { card: name(code), n: 2 })
    expect(s.assets[code]!.uses).toBe(charges - 1)
    // FAQ: another replacement may be declared on one of the future reveals.
    expect(labels(s)).toContain('ability.tokenRevealReplace')
    s = reveal(bag(s, -1, 'skull'))
    expect(s.pending!.question.prompt).toBe('prompt.chooseRevealedToken')
    s = pick(s, -1)
    expect(s.skillTest!.tokens).toEqual([-1])
    expect(s.skillTest!.ignoredTokens).toEqual(['skull'])
    s = apply(s)
    expect(s.skillTest).toBeNull()
    expect(sorted(s.chaosBag)).toEqual(sorted([-1, 'skull']))
  },
)

it('Grotesque Statue is discarded when its last charge is spent, and the reveal still changes', () => {
  let s = startTest(setup('60421', { enemy: null, asset: { uses: 1 } }))
  s = choose(s, 'ability.tokenRevealReplace', { card: name('60421'), n: 2 })
  expect(s.assets['60421']).toBeUndefined()
  expect(me(s).discard).toContain('60421')
  s = pick(reveal(bag(s, 0, 'cultist')), 'cultist')
  expect(s.skillTest!.tokens).toEqual(['cultist'])
})

it('an ignored symbol does not count as revealed for "if a symbol is revealed" effects', () => {
  let s = startTest(setup('01071', { enemy: null }))
  s = choose(s, 'ability.tokenRevealReplace', { card: name('01071'), n: 2 })
  s = pick(reveal(bag(s, 0, 'skull')), 0)
  expect(s.skillTest!.tokens).not.toContain('skull')
})

it('Grotesque Statue also replaces a reveal outside a skill test, holding the ignored token', () => {
  let s = setup('05155', { enemy: null })
  s = during(s, (x) => withAsset(x, '01071'))
  s = choose(bag(s, 1, 'tablet'), 'ability.henryWan', { card: name('05155') })
  expect(s.pending!.question.prompt).toBe('prompt.wouldRevealToken')
  s = choose(s, 'ability.tokenRevealReplace', { card: name('01071'), n: 2 })
  s = pick(s, 1)
  // The tablet was ignored, so Henry Wan continues; both tokens stay out of the bag.
  expect(s.chaosBag).toEqual([])
  s = choose(s, 'choice.henryWanStop', { n: 1 })
  s = choose(s, 'choice.henryWanSplit', { draw: 0, gain: 1 })
  expect(sorted(s.chaosBag)).toEqual(sorted([1, 'tablet']))
  expect(me(s).resources).toBe(6)
})

it.each(['04032', '60417'])(
  'Dark Prophecy %s reveals 5 tokens and must resolve a symbol token when one is revealed',
  (code) => {
    let s = startTest(inHand(setup('01071', { enemy: null }), code))
    s = choose(s, 'ability.playFastFor', { card: name(code) })
    s = choose(s, 'ability.playCard', { card: name(code) })
    expect(me(s).resources).toBe(9)
    expect(me(s).discard).toContain(code)
    // The Statue may replace one predeclared reveal; declining preserves the original five.
    expect(labels(s)).toContain('ability.tokenRevealReplace')
    // The only symbol token is resolved without a choice.
    s = reveal(bag(s, 1, 0, -1, 'cultist', 'elderSign', -2))
    expect(s.skillTest!.tokens).toEqual(['cultist'])
    expect(s.skillTest!.ignoredTokens).toHaveLength(4)
    expect(s.chaosBag).toHaveLength(1)
  },
)

it('Dark Prophecy resolves any token when no symbol is revealed, and only for the performer', () => {
  let s = startTest(inHand(setup('01071', { enemy: null, players: ['a', 'b'] }), '04032'))
  expect(labels(s)).toContain('ability.playFastFor')
  s = choose(s, 'ability.playFastFor', { card: name('04032') })
  s = choose(s, 'ability.playCard', { card: name('04032') })
  s = reveal(bag(s, 1, 0, -1))
  expect(sorted(s.pending!.question.choices.map((c) => c.params!.token as ChaosToken))).toEqual(
    sorted([1, 0, -1]),
  )
  expect(playerCardBehavior('04032')!.canPlay!(s, 'b')).toBe(false)
})

it('Dark Prophecy can be played when a chaos token would be revealed outside a skill test', () => {
  let s = setup('05155', { enemy: null })
  s = during(s, patch({ hand: ['04032'], resources: 5 }))
  s = choose(bag(s, 1, 'skull', 0), 'ability.henryWan', { card: name('05155') })
  s = choose(s, 'ability.playFastFor', { card: name('04032') })
  // The only symbol is resolved: Henry Wan does nothing and every token returns.
  expect(sorted(s.chaosBag)).toEqual(sorted([1, 'skull', 0]))
  expect(me(s).resources).toBe(4)
})

it('Against All Odds reveals X more tokens, X being the difficulty above the base skill', () => {
  let s = startTest(inHand(setup('01071', { enemy: null }), '04202'), 5)
  s = choose(s, 'ability.playFastFor', { card: name('04202') })
  s = choose(s, 'ability.playCard', { card: name('04202') })
  s = reveal(bag(s, 1, 0, -1, -2))
  expect(s.pending!.question.choices).toHaveLength(3)
  expect(s.chaosBag).toHaveLength(1)
  s = pick(s, 1)
  expect(s.skillTest!.ignoredTokens).toHaveLength(2)
})

it('Against All Odds cannot be played unless the difficulty exceeds the base skill value', () => {
  const s = startTest(inHand(setup('01071', { enemy: null }), '04202'), 3)
  expect(playerCardBehavior('04202')!.canPlay!(s, 'a')).toBe(false)
  expect(labels(s)).not.toContain('ability.playFastFor')
})

it.each([
  [[-1, -1, 0] as ChaosToken[], 3],
  [[-1, 0, 1] as ChaosToken[], 1],
])(
  'Breath of the Sleeper: willpower attack, extra tokens, +2 damage when the chosen token is matched (%j)',
  (tokens, damage) => {
    let s = setup('11066')
    s = fight(s, '11066', 'willpower')
    expect(s.skillTest!.skill).toBe('willpower')
    expect(labels(s).filter((l) => l === 'ability.tokenRevealExtra')).toHaveLength(3)
    s = choose(s, 'ability.tokenRevealExtra', { card: name('11066'), n: 2 })
    expect(s.assets['11066']!.uses).toBe(7)
    s = pick(reveal(bag(s, ...tokens)), -1)
    s = apply(s)
    expect(Object.values(s.enemies)[0]!.damageTaken).toBe(damage)
  },
)

it('Breath of the Sleeper counts a match made by another card replacement', () => {
  let s = setup('11066')
  s = during(s, (x) => withAsset(x, '01071'))
  s = fight(s, '11066', 'willpower')
  s = choose(s, 'ability.tokenRevealReplace', { card: name('01071'), n: 2 })
  expect(labels(s)).not.toContain('ability.tokenRevealExtra')
  s = apply(reveal(bag(s, 0, 0)))
  expect(Object.values(s.enemies)[0]!.damageTaken).toBe(3)
})

it('Eyes of the Dreamer discovers 1 additional clue when the chosen token matches', () => {
  let s = setup('11067', { enemy: null })
  s = investigate(s, '11067', 'willpower')
  s = choose(s, 'ability.tokenRevealExtra', { card: name('11067'), n: 1 })
  s = apply(reveal(bag(s, 1, 1)))
  expect(me(s).clues).toBe(2)
  let t = investigate(setup('11067', { enemy: null }), '11067', 'willpower')
  t = choose(t, 'ability.tokenRevealExtra', { card: name('11067'), n: 1 })
  t = apply(pick(reveal(bag(t, 1, 0)), 1))
  expect(me(t).clues).toBe(1)
})

it('Eyes of the Dreamer counts a token ignored by Katarina Sojka while spending a charge', () => {
  let s = during(setup('11067', { enemy: null }), (s) => withAsset(s, '11069'))
  s = investigate(s, '11067', 'willpower')
  s = choose(s, 'ability.tokenRevealExtra', { card: name('11067'), n: 1 })
  s = choose(s, 'ability.tokenRevealUntilSymbol', { card: name('11069') })
  let matching: GameState | undefined
  for (let rng = 1; rng < 60 && !matching; rng++) {
    const drawn = reveal(bag({ ...s, rng }, 1, 'skull', 1))
    if (
      drawn.skillTest?.ignoredTokens?.includes(1) &&
      labels(drawn).includes('choice.resolveToken')
    )
      matching = drawn
  }
  expect(matching?.skillTest?.ignoredTokens).toEqual([1])
  const chosen = pick(matching!, 1)
  expect(chosen.skillTest?.tokenChoice?.ignored).toEqual(['skull'])
  expect(me(apply(chosen)).clues).toBe(2)
})

it('Katarina Sojka reveals until a symbol, resolves it and ignores the others', () => {
  let s = startTest(setup('11069', { enemy: null }))
  s = choose(s, 'ability.tokenRevealUntilSymbol', { card: name('11069') })
  expect(s.assets['11069']!.exhausted).toBe(true)
  s = reveal(bag(s, 1, 0, -1, 'elderSign'))
  expect(s.skillTest!.tokens).toEqual(['elderSign'])
  expect((s.skillTest!.ignoredTokens ?? []).every((t) => typeof t === 'number')).toBe(true)
})

it("Katarina Sojka is only offered during her controller's own skill test", () => {
  const s = setup('11069', { enemy: null })
  const options = playerCardBehavior('11069')!.wouldRevealOptions!(
    { ...s, wouldReveal: { investigator: 'a' } },
    s.assets['11069']!,
  )
  expect(options).toEqual([])
})

it('Henry Wan: stopping gives a card or a resource for each revealed token', () => {
  let s = setup('05155', { enemy: null })
  const hand = me(s).hand.length
  s = choose(bag(s, -1, -1), 'ability.henryWan', { card: name('05155') })
  expect(s.assets['05155']!.exhausted).toBe(true)
  s = choose(s, 'choice.revealAnother')
  s = choose(s, 'choice.henryWanStop', { n: 2 })
  s = choose(s, 'choice.henryWanSplit', { draw: 1, gain: 0 })
  s = choose(s, 'choice.skip')
  expect(me(s).hand.length).toBe(hand + 1)
  expect(me(s).resources).toBe(5)
  expect(sorted(s.chaosBag)).toEqual(sorted([-1, -1]))
})

it('Henry Wan does nothing when a symbol is revealed', () => {
  let s = setup('05155', { enemy: null })
  s = choose(bag(s, 1, 1), 'ability.henryWan', { card: name('05155') })
  s = choose(bag(s, 'autoFail'), 'choice.revealAnother')
  expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
  expect(me(s).resources).toBe(5)
  expect(sorted(s.chaosBag)).toEqual(sorted([1, 'autoFail']))
})

it('21 or Bust values symbols as 5, auto-fail as 10, elder sign as 1 or 11 and frost as 0', () => {
  expect(bustTotals(['skull', 'autoFail', -4])).toEqual([19])
  expect(bustTotals(['tablet', 'elderSign', 'frost', -5])).toEqual([11, 21])
  expect([18, 19, 20, 21, 22].map(bustReward)).toEqual([4, 5, 6, 9, 0])
})

it('21 or Bust reveals until you stop and returns every token', () => {
  let s = inHand(setup('05155', { enemy: null }), '08048', 5)
  s = choose(bag(s, 'cultist', 'elderSign', -5), 'action.play', { card: name('08048') })
  s = choose(s, 'choice.revealAnother')
  s = choose(s, 'choice.revealAnother')
  s = choose(s, 'choice.bustStop', { total: '11/21' })
  s = choose(s, 'choice.bustTotal', { total: 21 })
  expect(me(s).resources).toBe(5 - 2 + 9)
  expect(sorted(s.chaosBag)).toEqual(sorted(['cultist', 'elderSign', -5]))
})

const brute: EnemyCard = { ...sturdy, code: 'brute', name: 'Brute', fight: 4 }
const other: EnemyCard = { ...sturdy, code: 'other', name: 'Other' }
const enemies = (s: GameState) => Object.values(s.enemies)
const byName = (s: GameState, n: string) => enemies(s).find((e) => e.name === n)!

it.each([
  ['03153', 0, 2, 1],
  ['52008', 2, 3, 2],
])(
  'Storm of Spirits %s: willpower +%i, %i damage to each enemy there and symbol damage to investigators',
  (code, bonus, area, burn) => {
    let s = setup('01071', { enemy: other, players: ['a', 'b'] })
    s = during(s, (x) => x, spawnAt('A', brute, 'b'))
    s = inHand(s, code)
    s = choose(s, 'action.play', { card: name(code) })
    s = choose(s, 'choice.enemy', { enemy: 'Other' })
    expect(s.skillTest!.skill).toBe('willpower')
    expect(s.skillTest!.baseModifier).toBe(bonus)
    s = apply(choose(bag(s, 'skull'), 'choice.revealToken'))
    expect(byName(s, 'Other').damageTaken).toBe(area)
    expect(byName(s, 'Brute').damageTaken).toBe(area)
    expect(me(s).damage).toBe(burn)
    expect(s.investigators.find((i) => i.id === 'b')!.damage).toBe(burn)
  },
)

it('Storm of Spirits deals symbol damage even when the attack fails, and no area damage', () => {
  let s = setup('01071', { enemy: { ...other, fight: 9 } })
  s = choose(inHand(s, '03153'), 'action.play', { card: name('03153') })
  s = apply(choose(bag(s, 'autoFail'), 'choice.revealToken'))
  expect(enemies(s)[0]!.damageTaken).toBe(0)
  expect(me(s).damage).toBe(1)
})

it('Mk 1 Grenades: 2 damage to each enemy and each other investigator, additional damage to the target', () => {
  let s = setup('05273', { enemy: other, players: ['a', 'b'] })
  s = during(s, (x) => x, spawnAt('A', brute, 'b'))
  s = fight(s, '05273')
  expect(s.assets['05273']!.uses).toBe(2)
  s = resolve(s)
  expect(byName(s, 'Other').damageTaken).toBe(2)
  expect(byName(s, 'Brute').damageTaken).toBe(2)
  expect(me(s).damage).toBe(0)
  expect(s.investigators.find((i) => i.id === 'b')!.damage).toBe(2)
})

it('Mk 1 Grenades are discarded when the last supply is spent', () => {
  let s = setup('05273', { asset: { uses: 1 } })
  s = resolve(fight(s, '05273'))
  expect(s.assets['05273']).toBeUndefined()
  expect(enemies(s)[0]!.damageTaken).toBe(2)
})

it('Old Hunting Rifle: +3 and +2 damage; a skull jams it and the attack fails', () => {
  let s = setup('04273')
  s = resolve(fight(s, '04273'))
  expect(enemies(s)[0]!.damageTaken).toBe(3)
  s = fight(s, '04273')
  s = resolve(s, 'skull')
  expect(s.skillTest).toBeNull()
  expect(enemies(s)[0]!.damageTaken).toBe(3)
  expect(s.assets['04273']!.form).toBe('jammed')
  expect(availableAbilities(s, 'a').some((a) => a.key.startsWith('04273:fight'))).toBe(false)
  const clear = availableAbilities(s, 'a').find((a) => a.key === '04273:unjam')!
  expect(clear.actions).toBe(1)
  s = choose(s, 'ability.clearJam', { card: name('04273') })
  expect(availableAbilities(s, 'a').some((a) => a.key.startsWith('04273:fight'))).toBe(true)
})

it('Old Hunting Rifle does not jam when the skull is ignored', () => {
  let s = setup('04273')
  s = during(s, (x) => withAsset(x, '01071'))
  s = fight(s, '04273')
  s = choose(s, 'ability.tokenRevealReplace', { card: name('01071'), n: 2 })
  s = apply(pick(reveal(bag(s, 'skull', 0)), 0))
  expect(s.assets['04273']!.form).toBeUndefined()
})

it('Flamethrower must target the engaged enemy with the highest fight and assigns up to 4 damage', () => {
  let s = setup('04305', { enemy: other })
  s = during(s, (x) => x, spawnAt('A', brute, 'a'), spawnAt('A', ghoul, null))
  const keys = availableAbilities(s, 'a')
    .filter((a) => a.key.startsWith('04305:fight'))
    .map((a) => a.target)
  expect(keys).toEqual([{ type: 'enemy', id: byName(s, 'Brute').id }])
  s = choose(s, 'ability.fightWith', { card: name('04305'), enemy: 'Brute' })
  expect(s.skillTest!.baseModifier).toBe(4)
  s = apply(choose(bag(s, 0), 'choice.revealToken'))
  for (const n of [4, 3, 2]) s = choose(s, 'choice.flameAssign', { enemy: 'Brute', n })
  s = choose(s, 'choice.flameAssign', { enemy: 'Other', n: 1 })
  expect(byName(s, 'Brute').damageTaken).toBe(3)
  expect(byName(s, 'Other').damageTaken).toBe(1)
  expect(byName(s, 'Ghoul').damageTaken).toBe(0)
  expect(s.assets['04305']!.uses).toBe(3)
})

it.each([
  ['01571', '01071'],
  ['60417', '04032'],
])('reprint %s keeps the EN/ES text of %s and shares its behavior', (reprint, original) => {
  for (const source of [en, es]) {
    const text = (code: string) => source.find((c) => c.code === code)!.text
    expect(text(reprint)).toBe(text(original))
  }
})

it('every card has its approved definition', () => {
  for (const c of data) expect(playerCardDef(c.code)).toMatchObject({ name: c.name, xp: c.xp })
})
