// RR: Chaos Bag (Bless/Curse tokens), Triggered Abilities, Skill Tests (ST.3–ST.8), Cancel,
// Automatic Success, Permanent, Exile, Uses.
import { expect, it } from 'vitest'
import {
  availableAbilities,
  playerCardBehavior,
  type ChaosToken,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, during, ghoul, labels } from '@lcg/engine/testing'
import { game, patch } from '../dunwich-pilot/testing'
import { setup, name, enemy, fight, investigate, evade } from '../basic-abilities/testing'
import { investigatorCards, validateDeck } from '../decks'
import data from '../data/token-triggers.json'
import './index'

const test = (difficulty = 2): Message => ({
  type: 'BeginSkillTest',
  investigator: 'a',
  skill: 'willpower',
  difficulty,
  kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
})
const me = (s: GameState) => s.investigators.find((i) => i.id === 'a')!
const count = (s: GameState, token: ChaosToken) => s.chaosBag.filter((t) => t === token).length
const startTest = (s: GameState, difficulty = 2) => during(s, (x) => x, test(difficulty))
const reveal = (s: GameState) => choose(s, 'choice.revealToken')
const apply = (s: GameState) => choose(s, 'choice.applyResults')
const use = (s: GameState, code: string, params: Record<string, string | number> = {}) =>
  choose(s, 'ability.tokenTrigger.' + code, { card: name(code), ...params })
/** A test in progress with this exact chaos bag, tokens revealed (window open or resolved). */
const revealWith = (s: GameState, tokens: ChaosToken[], difficulty = 2) =>
  reveal({ ...startTest(s, difficulty), chaosBag: tokens })
const location = (s: GameState, id: string, changes: object): GameState => ({
  ...s,
  locations: { ...s.locations, [id]: { ...s.locations[id]!, ...changes } },
})

it.each(data)('$code has a reviewed implementation', (c) =>
  expect(playerCardBehavior(c.code)).toBeDefined(),
)

it.each(['07117', '07226'])('Armageddon %s: willpower attack, +1 damage, curse choices', (code) => {
  let s = setup(code, { asset: { uses: 3 } })
  s = fight(s, code, 'willpower')
  expect(s.skillTest?.skill).toBe('willpower')
  const kind = s.skillTest?.kind
  expect(kind?.type === 'fight' && kind.extraDamage).toBe(1)
  expect(s.skillTest?.baseModifier ?? 0).toBe(code === '07226' ? 2 : 0)
  expect(s.assets[code]!.uses).toBe(2)
  s = reveal({ ...s, chaosBag: ['curse', 'curse'] })
  // First curse: deal 1 damage to an enemy at your location or place 1 charge.
  expect(labels(s)).toContain('choice.curseDamage')
  s = choose(s, 'choice.curseCharge', { card: name(code) })
  expect(s.assets[code]!.uses).toBe(3)
  // Level 0 resolves it once; level 4 for each curse token (FAQ: one at a time).
  if (code === '07226') {
    s = choose(s, 'choice.curseDamage', { card: name(code), enemy: enemy(s).name })
    expect(enemy(s).damageTaken).toBe(1)
  } else expect(labels(s)).not.toContain('choice.curseDamage')
})

it('Eye of Chaos (4) discovers a clue at a connecting location for a curse', () => {
  let s = setup('07227', { enemy: null, asset: { uses: 3 } })
  s = location(s, 'B', { revealed: true, clues: 2 })
  s = investigate(s, '07227', 'willpower')
  const kind = s.skillTest?.kind
  expect(kind?.type === 'investigate' && kind.extraClues).toBe(1)
  s = reveal({ ...s, chaosBag: ['curse'] })
  s = choose(s, 'choice.curseClue', { card: name('07227'), location: 'Room B' })
  expect(s.locations.B!.clues).toBe(1)
  expect(me(s).clues).toBe(1)
})

it('Shroud of Shadows (4) lets you move to a connecting location for a curse', () => {
  let s = setup('07228', { asset: { uses: 3 } })
  s = location(s, 'B', { revealed: true })
  s = evade(s, '07228', 'willpower')
  expect(s.skillTest?.baseModifier).toBe(2)
  s = reveal({ ...s, chaosBag: ['curse'] })
  s = choose(s, 'choice.curseMove', { card: name('07228'), location: 'Room B' })
  expect(me(s).location).toBe('B')
})

it('Shroud of Shadows may move a non-Elite enemy it evades to a connecting location', () => {
  let s = setup('07119', { asset: { uses: 3 } })
  s = location(s, 'B', { revealed: true })
  s = apply(reveal({ ...evade(s, '07119', 'willpower'), chaosBag: [0] }))
  s = choose(s, 'choice.moveEnemyTo', { enemy: enemy(s).name, location: 'Room B' })
  expect(enemy(s).location).toBe('B')
  let elite = setup('07119', { asset: { uses: 3 }, enemy: { ...ghoul, traits: ['Elite'] } })
  elite = apply(reveal({ ...evade(elite, '07119', 'willpower'), chaosBag: [0] }))
  expect(labels(elite)).not.toContain('choice.moveEnemyTo')
})

it.each([
  ['07190', 'bless', 'elderSign'],
  ['07195', 'curse', 'skull'],
] as const)('%s treats the second %s token as %s', (code, token, face) => {
  let s = setup(code, { enemy: null })
  s = revealWith(s, [token, token], 10)
  expect(labels(s)).toContain('ability.tokenTrigger.' + code)
  s = use(s, code)
  if (code === '07195') s = choose(s, 'choice.aeonsKeep')
  expect(s.skillTest?.tokens).toEqual([token, face])
  expect(s.assets[code]!.exhausted).toBe(true)
  s = apply(s)
  // Both tokens return to the chaos bag instead of the token pool.
  expect(count(s, token)).toBe(2)
})

it('Curse of Aeons may remove both curse tokens from the bag after the test', () => {
  let s = revealWith(setup('07195', { enemy: null }), ['curse', 'curse'], 10)
  s = choose(use(s, '07195'), 'choice.aeonsRemove')
  expect(count(apply(s), 'curse')).toBe(0)
})

it('Blessing of Isis does not react to the first bless token', () => {
  const s = revealWith(setup('07190', { enemy: null }), ['bless'], 10)
  expect(labels(s)).not.toContain('ability.tokenTrigger.07190')
})

it('Blasphemous Covenant treats a curse as +1 and returns it to the bag', () => {
  let s = revealWith(setup('07113', { enemy: null }), ['curse'])
  s = use(s, '07113')
  expect(s.skillTest?.tokenModifier).toBe(1)
  s = apply(s)
  expect(count(s, 'curse')).toBe(1)
})

it('False Covenant cancels a curse, returns it to the pool and reveals another token', () => {
  let s = revealWith(setup('07116', { enemy: null }), ['curse'])
  s = { ...s, chaosBag: [...s.chaosBag, 1] }
  s = use(s, '07116')
  expect(s.skillTest?.tokens).toEqual([1])
  s = apply(s)
  expect(count(s, 'curse')).toBe(0)
  expect(s.chaosBag).toContain(1)
})

it('Ancient Covenant stops a bless token from revealing another token', () => {
  let s = revealWith(setup('07122', { enemy: null }), ['bless'])
  s = { ...s, chaosBag: [0] }
  s = use(s, '07122')
  expect(s.skillTest?.tokens).toEqual(['bless'])
  expect(s.chaosBag).toEqual([0])
})

it('Sacred Covenant returns revealed bless tokens to the bag after the reveal step', () => {
  let s = revealWith(setup('07110', { enemy: null }), ['bless', 'bless'])
  expect(s.skillTest?.tokenModifier).toBe(4)
  s = use(s, '07110')
  s = choose(s, 'choice.sacredReturn', { n: 2 })
  expect(s.skillTest?.tokens).toEqual([])
  expect(s.skillTest?.tokenModifier).toBe(0)
  expect(count(s, 'bless')).toBe(2)
})

it('Paradoxical Covenant makes the test succeed when bless and curse were revealed', () => {
  let s = revealWith(setup('07120', { enemy: null }), ['bless', 'curse'], 20)
  s = apply(use(s, '07120'))
  expect(s.lastSkillTest?.succeeded).toBe(true)
  // Revealed bless and curse tokens leave the bag as usual.
  expect(s.chaosBag).toEqual([])
})

it('Covenants are permanent and limited to 1 per deck', () => {
  for (const code of ['07110', '07113', '07116', '07120', '07122'])
    expect(playerCardBehavior(code)?.permanent).toBeDefined()
  const deck = (cards: string[]) =>
    validateDeck(
      { id: 'd', name: 'd', investigator: investigatorCards()[0]!.code, cards },
      false,
    ).problems.map((p) => p.key)
  expect(deck(['07110', '07116'])).toContain('deck.problem.covenantLimit')
  expect(deck(['07116'])).not.toContain('deck.problem.covenantLimit')
})

it('"Lucky" Penny flips a coin for each bless or curse token you reveal', () => {
  const s = revealWith(setup('07224', { enemy: null }), ['bless'])
  const flips = s.log.filter((l) => l.key === 'log.coinHeads' || l.key === 'log.coinTails')
  expect(flips).toHaveLength(1)
  const tails = flips[0]!.key === 'log.coinTails'
  expect(s.skillTest?.tokens).toEqual([tails ? 'curse' : 'bless'])
  // Treating a bless token as a curse token draws 1 card.
  const forced = playerCardBehavior('07224')!.forced!
  const held = startTest(setup('07224', { enemy: null }))
  const window: GameState = {
    ...held,
    skillTest: { ...held.skillTest!, revealing: { token: 'curse', face: 'curse' } },
  }
  expect(
    forced(
      window,
      { type: 'whenRevealChaosToken', investigator: 'a', token: 'curse' },
      window.assets['07224']!,
    ),
  ).toEqual([
    {
      type: 'FlipCoin',
      investigator: 'a',
      heads: [{ type: 'TreatRevealedTokenAs', token: 'bless' }],
      tails: [],
    },
  ])
})

it.each([
  ['tablet', 'ability.blackCatTablet', -1],
  ['elderThing', 'ability.blackCatElderThing', -1],
  ['elderSign', 'ability.blackCatElderSign', 5],
] as const)('The Black Cat replaces the %s effects', (token, label, modifier) => {
  let s = setup('06285', { enemy: null, asset: { damage: 1, horror: 1 } })
  s = revealWith(s, [token])
  s = choose(s, label, { card: name('06285') })
  expect(s.skillTest?.tokenModifier).toBe(modifier)
  const cat = s.assets['06285']!
  if (token === 'tablet') expect([cat.damage, cat.horror]).toEqual([2, 1])
  if (token === 'elderThing') expect([cat.damage, cat.horror]).toEqual([1, 2])
  if (token === 'elderSign') expect([cat.damage, cat.horror]).toEqual([0, 0])
})

it('Beloved replaces a bless token with an automatic success and leaves the game', () => {
  let s = during(setup('07122', { enemy: null }), patch({ hand: ['07036'] }))
  s = startTest(s, 20)
  s = choose(s, 'choice.commit', { card: name('07036') })
  s = reveal({ ...s, chaosBag: ['bless'] })
  s = choose(s, 'ability.tokenTrigger.07036', { card: name('07036') })
  expect(s.skillTest?.tokens).toEqual(['bless'])
  expect(s.skillTest?.committed).toHaveLength(0)
  s = apply(s)
  expect(s.lastSkillTest?.succeeded).toBe(true)
  expect(me(s).discard).not.toContain('07036')
  expect(count(s, 'bless')).toBe(1)
})

it.each([
  [-3 as ChaosToken, true],
  ['autoFail' as ChaosToken, false],
])('Stroke of Luck is exiled after revealing %s for an automatic success', (token, success) => {
  let s = during(setup('07122', { enemy: null }), patch({ hand: ['02271'] }))
  s = startTest(s, 20)
  s = choose(s, 'choice.commit', { card: name('02271') })
  s = reveal({ ...s, chaosBag: [token] })
  s = choose(s, 'ability.tokenTrigger.02271', { card: name('02271') })
  s = apply(s)
  expect(s.lastSkillTest?.succeeded).toBe(success)
  expect(s.exiled).toContainEqual({ investigator: 'a', code: '02271' })
  expect(me(s).discard).not.toContain('02271')
})

it('Stroke of Luck can only be committed to your own test', () => {
  const s = startTest(setup('07122', { enemy: null }))
  expect(playerCardBehavior('02271')!.canCommit!(s, s.skillTest!, 'b')).toBe(false)
  expect(playerCardBehavior('02271')!.canCommit!(s, s.skillTest!, 'a')).toBe(true)
})

it('Dawn Star ignores revealed curse modifiers and deals 1 damage for each', () => {
  let s = during(setup('07122'), patch({ hand: ['10131'], resources: 3 }))
  s = revealWith(s, ['curse', 'curse'])
  expect(s.skillTest?.tokenModifier).toBe(-4)
  s = choose(s, 'ability.playCard', { card: name('10131') })
  expect(s.skillTest?.tokenModifier).toBe(0)
  s = choose(s, 'choice.curseDamage', { card: name('10131'), enemy: enemy(s).name })
  s = choose(s, 'choice.curseDamage', { card: name('10131'), enemy: enemy(s).name })
  expect(enemy(s).damageTaken).toBe(2)
  expect(me(s).resources).toBe(2)
})

it('Dawn Star is not offered without revealed curse tokens', () => {
  const s = revealWith(during(setup('07122'), patch({ hand: ['10131'] })), [0])
  expect(labels(s)).not.toContain('ability.playCard')
})

it('Token of Faith adds bless tokens after a test with curse tokens and offers a retry', () => {
  let s = revealWith(setup('10126', { enemy: null }), ['curse'], 10)
  s = apply(s)
  s = use(s, '10126', { n: 1 })
  expect(count(s, 'bless')).toBe(1)
  expect(labels(s)).toContain('choice.retryTokenOfFaith')
  s = choose(s, 'choice.retryTokenOfFaith', { card: name('10126') })
  expect(s.skillTest?.difficulty).toBe(10)
})

it('Prismatic Spectacles adds a curse to investigate and may discover an extra clue', () => {
  let s = setup('10056', { enemy: null })
  s = { ...s, chaosBag: [] }
  s = investigate(s, '10056')
  expect(s.skillTest?.baseModifier).toBe(2)
  expect(s.chaosBag).toEqual(['curse'])
  s = reveal(s)
  s = choose(s, 'choice.spectaclesClue', { card: name('10056') })
  expect(s.assets['10056']!.exhausted).toBe(true)
  expect(me(s).clues).toBe(1)
})

it('Nkosi Mabati names a sigil and reveals it instead of a symbol at your location', () => {
  let s = during({ ...game(), interactive: true }, patch({ hand: ['08091'], resources: 10 }))
  s = choose(s, 'action.play', { card: name('08091') })
  s = choose(s, 'choice.nameSigil', { token: 'elderThing' })
  const nkosi = Object.values(s.assets).find((a) => a.code === '08091')!
  expect(nkosi.form).toBe('elderThing')
  s = startTest(s, 2)
  let found: GameState | undefined
  for (let seed = 1; seed < 60 && !found; seed++) {
    const t = reveal({ ...s, rng: seed, chaosBag: ['tablet', 'elderThing'] })
    if (labels(t).includes('ability.tokenTrigger.08091')) found = t
  }
  s = choose(found!, 'ability.tokenTrigger.08091', { card: name('08091'), token: 'elderThing' })
  expect(s.skillTest?.tokens).toEqual(['elderThing'])
  expect(s.chaosBag).toEqual(['tablet'])
  expect(s.assets[nkosi.id]!.exhausted).toBe(true)
  expect(availableAbilities(s, 'a')).toBeDefined()
})
