// RR: Seal, Chaos Bag (Bless/Curse tokens), Triggered Abilities, Enemy Attacks (Cancel), Uses,
// Fight, Investigate, Limits.
import { expect, it } from 'vitest'
import {
  availableAbilities,
  dispatch,
  playerCardBehavior,
  type Asset,
  type ChaosToken,
  type GameState,
  type Message,
  type Trigger,
} from '@lcg/engine'
import { choose, during, ghoul, labels } from '@lcg/engine/testing'
import { game, patch, withAsset } from '../dunwich-pilot/testing'
import { setup, name } from '../basic-abilities/testing'
import data from '../data/sealed-tokens.json'
import { sealedOn } from './cards'
import './index'
import '../token-triggers/index'

const test = (difficulty = 2): Message => ({
  type: 'BeginSkillTest',
  investigator: 'a',
  skill: 'willpower',
  difficulty,
  kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
})
const me = (s: GameState) => s.investigators.find((i) => i.id === 'a')!
const count = (s: GameState, token: ChaosToken) => s.chaosBag.filter((t) => t === token).length
const bag =
  (...tokens: ChaosToken[]) =>
  (s: GameState) => ({ ...s, chaosBag: tokens })
const base = (players?: string[]) =>
  during({ ...game(players), interactive: true }, patch({ resources: 10, hand: [] }))
const withHand = (s: GameState, codes: string[]) => during(s, patch({ hand: codes }))
const startTest = (s: GameState, difficulty = 2) => during(s, (x) => x, test(difficulty))
const reveal = (s: GameState) => choose(s, 'choice.revealToken')
const apply = (s: GameState) => choose(s, 'choice.applyResults')
const play = (s: GameState, code: string) => choose(s, 'action.play', { card: name(code) })
/** Seal tokens directly on an asset already in play. */
const sealedWith =
  (id: string, ...tokens: ChaosToken[]) =>
  (s: GameState): GameState => ({
    ...s,
    sealed: [
      ...(s.sealed ?? []),
      ...tokens.map((token) => ({
        token,
        investigator: 'a',
        code: id,
        holder: { type: 'asset' as const, id },
      })),
    ],
  })
const forced = (s: GameState, code: string, trigger: Trigger) =>
  playerCardBehavior(code)!.forced!(s, trigger, s.assets[code]!)
const choiceLabels = (messages: Message[]) =>
  messages.flatMap((m) => (m.type === 'Ask' ? m.question.choices.map((c) => c.label) : []))
const asset = (s: GameState, code: string): Asset => s.assets[code]!
const assetOf = (s: GameState, code: string) => Object.values(s.assets).find((a) => a.code === code)

/** End the turn and advance until an attack reaction with `label` is offered. */
function untilReaction(s: GameState, label: string): GameState {
  s = choose(s, 'action.endTurn')
  for (let n = 0; n < 40 && s.pending && !labels(s).includes(label); n++)
    s = choose(s, labels(s)[0]!)
  return s
}

it.each(data)('$code has a reviewed implementation', (c) =>
  expect(playerCardBehavior(c.code)).toBeDefined(),
)

it('Shield of Faith seals up to 5 bless tokens when it enters play', () => {
  let s = withHand(during(base(), bag('bless', 'bless', 'bless', 0)), ['07221'])
  s = play(s, '07221')
  expect(labels(s).filter((l) => l === 'choice.sealCount')).toHaveLength(4)
  s = choose(s, 'choice.sealCount', { n: 2, token: 'bless', card: name('07221') })
  const shield = assetOf(s, '07221')!
  expect(sealedOn(s, shield.id)).toHaveLength(2)
  expect(count(s, 'bless')).toBe(1)
})

it('Shield of Faith is discarded if no tokens are sealed on it', () => {
  let s = withHand(during(base(), bag('bless', 0)), ['07221'])
  s = play(s, '07221')
  s = choose(s, 'choice.sealCount', { n: 0, token: 'bless', card: name('07221') })
  expect(assetOf(s, '07221')).toBeUndefined()
  expect(me(s).discard).toContain('07221')
})

it('Shield of Faith releases a token to cancel an attack and is discarded when empty', () => {
  let s = setup('07221', { enemy: ghoul })
  s = during(s, sealedWith('07221', 'bless'))
  s = untilReaction(s, 'ability.sealCancelAttack')
  s = choose(s, 'ability.sealCancelAttack', { card: name('07221'), enemy: ghoul.name })
  expect(me(s).damage + me(s).horror).toBe(0)
  expect(s.sealed ?? []).toHaveLength(0)
  expect(s.chaosBag).toContain('bless')
  expect(s.assets['07221']).toBeUndefined()
})

it('Dark Ritual seals curse tokens and must be paid at the end of the mythos phase', () => {
  let s = withHand(during(base(), bag('curse', 'curse', 'curse', 0)), ['07026'])
  s = play(s, '07026')
  s = choose(s, 'choice.sealCount', { n: 3, token: 'curse', card: name('07026') })
  const ritual = assetOf(s, '07026')!
  expect(sealedOn(s, ritual.id, 'curse')).toHaveLength(3)
  expect(count(s, 'curse')).toBe(0)
  const keep = playerCardBehavior('07026')!.forced!(s, { type: 'mythosPhaseEnds' }, ritual)
  expect(choiceLabels(keep)).toEqual(['choice.sealKeepResource', 'choice.discard'])
  const broke = during(s, patch({ resources: 0 }))
  expect(playerCardBehavior('07026')!.forced!(broke, { type: 'mythosPhaseEnds' }, ritual)).toEqual([
    { type: 'DiscardAsset', asset: ritual.id },
  ])
})

it('Favor of the Sun resolves a sealed bless token instead of revealing one', () => {
  let s = setup('07272', { enemy: null })
  s = during(s, sealedWith('07272', 'bless', 'bless'))
  s = { ...startTest(s, 2), chaosBag: [0] }
  s = reveal(s)
  expect(labels(s)).toContain('ability.resolveSealedExhaust')
  s = choose(s, 'ability.resolveSealedExhaust', { card: name('07272') })
  expect(s.skillTest?.tokens[0]).toBe('bless')
  expect(asset(s, '07272').exhausted).toBe(true)
  expect(sealedOn(s, '07272')).toHaveLength(1)
  s = apply(s)
  // The resolved bless token returns to the token pool after the test.
  expect(count(s, 'bless')).toBe(0)
  expect(s.assets['07272']).toBeDefined()
})

it('Favor of the Moon gains 1 resource and is discarded when its last token resolves', () => {
  let s = setup('07271', { enemy: null })
  s = during(s, sealedWith('07271', 'curse'))
  const before = me(s).resources
  s = reveal({ ...startTest(s, 0), chaosBag: [0] })
  s = choose(s, 'ability.resolveSealedExhaust', { card: name('07271') })
  expect(me(s).resources).toBe(before + 1)
  expect(s.assets['07271']).toBeUndefined()
})

it('Favor of the Sun cannot be used while exhausted', () => {
  let s = setup('07272', { enemy: null, asset: { exhausted: true } })
  s = during(s, sealedWith('07272', 'bless'))
  s = reveal({ ...startTest(s), chaosBag: [0] })
  expect(labels(s)).not.toContain('ability.resolveSealedExhaust')
})

it('Holy Spear seals 2 bless tokens for its strong attack and can release one', () => {
  let s = setup('07302')
  s = during(s, bag('bless', 'bless', 0))
  const options = availableAbilities(s, 'a').map((o) => o.label)
  expect(options).toContain('ability.holySpearSeal')
  expect(options).not.toContain('ability.holySpearRelease')
  s = choose(s, 'ability.holySpearSeal', { card: name('07302') })
  expect(sealedOn(s, '07302', 'bless')).toHaveLength(2)
  const kind = s.skillTest?.kind
  expect(kind?.type === 'fight' && kind.extraDamage).toBe(2)
  let t = during(setup('07302'), sealedWith('07302', 'bless'))
  t = choose(t, 'ability.holySpearRelease', { card: name('07302') })
  expect(sealedOn(t, '07302')).toHaveLength(0)
  expect(t.chaosBag).toContain('bless')
})

it.each(['04030', '53008'])('The Chthonian Stone %s needs a symbol token to seal', (code) => {
  const none = withHand(during(base(), bag(0, -1, 'autoFail')), [code])
  expect(availableAbilities(none, 'a').some((o) => o.params?.card === name(code))).toBe(false)
  let s = withHand(during(base(), bag('skull', 0)), [code])
  s = play(s, code)
  s = choose(s, 'choice.sealTokenOn', { token: 'skull', card: name(code) })
  expect(s.chaosBag).not.toContain('skull')
  expect(sealedOn(s, assetOf(s, code)!.id, 'skull')).toHaveLength(1)
})

// RR Seal: "If the specified token is not in the chaos bag, the card cannot enter play" (FAQ:
// by any means, not only when played).
it.each([
  ['04030', bag(0, -1, 'autoFail')],
  ['53008', bag(0, -1, 'autoFail')],
  ['04311', bag(0, 'skull')],
  ['11070', bag(0, -1, 'autoFail')],
] as const)('%s cannot be put into play without a token to seal', (code, tokens) => {
  const put: Message = { type: 'PutAssetIntoPlay', investigator: 'a', code, fromHand: true }
  const s = during(withHand(during(base(), tokens), [code]), (x) => x, put)
  expect(Object.values(s.assets).some((a) => a.code === code)).toBe(false)
  expect(me(s).hand).toContain(code)
})

it('The Chthonian Stone returns to hand after you reveal an auto-fail in a test', () => {
  const s = startTest(setup('04030', { enemy: null }))
  expect(
    forced(s, '04030', { type: 'afterRevealChaosToken', investigator: 'a', token: 'autoFail' }),
  ).toEqual([{ type: 'ReturnAssetToHand', asset: '04030' }])
  expect(
    forced(s, '04030', { type: 'afterRevealChaosToken', investigator: 'a', token: 'skull' }),
  ).toEqual([])
})

it('The Chthonian Stone (3) loses a charge per auto-fail and returns with none left', () => {
  let s = during(
    setup('53008', { enemy: null, asset: { uses: 1 } }),
    sealedWith('53008', 'cultist'),
  )
  s = startTest(s)
  s = reveal({ ...s, chaosBag: ['autoFail'] })
  expect(s.assets['53008']).toBeUndefined()
  expect(me(s).hand).toContain('53008')
  expect(s.chaosBag).toContain('cultist')
})

it('Protective Incantation seals any token but auto-fail, group limit 2, upkeep each turn', () => {
  let s = withHand(during(base(), bag('autoFail', -2)), ['04031'])
  s = play(s, '04031')
  expect(labels(s)).toEqual(['choice.sealTokenOn'])
  s = choose(s, 'choice.sealTokenOn', { token: '-2', card: name('04031') })
  const inc = assetOf(s, '04031')!
  expect(sealedOn(s, inc.id, -2)).toHaveLength(1)
  const two = withAsset(withAsset(base(), '04031'), 'x', { code: '04031' } as Partial<Asset>)
  expect(playerCardBehavior('04031')!.canPlay!(during(two, bag(0)), 'a')).toBe(false)
  const keep = playerCardBehavior('04031')!.forced!(s, { type: 'turnEnds', investigator: 'a' }, inc)
  expect(choiceLabels(keep)).toEqual(['choice.sealKeepResource', 'choice.discard'])
})

it('Crystalline Elder Sign seals +1 or elder sign and gives +1 to each skill', () => {
  const b = playerCardBehavior('04235')!
  expect(b.canPlay!(during(base(), bag(0, 'skull')), 'a')).toBe(false)
  expect(b.canPlay!(during(base(), bag(1)), 'a')).toBe(true)
  const s = setup('04235', { enemy: null })
  expect(b.skillModifier!(s, asset(s, '04235'), { investigator: 'a' } as never)).toBe(1)
})

it('Seal of the Seventh Sign loses charges on symbol tokens and leaves the game', () => {
  const s = startTest(setup('04311', { enemy: null, asset: { uses: 7 } }))
  expect(
    forced(s, '04311', { type: 'afterRevealChaosToken', investigator: 'b', token: 'tablet' })[0],
  ).toEqual({ type: 'RemoveUses', asset: '04311', amount: 1 })
  expect(
    forced(s, '04311', { type: 'afterRevealChaosToken', investigator: 'a', token: -1 }),
  ).toEqual([])
  expect(playerCardBehavior('04311')!.leavesPlay!(s, asset(s, '04311'), 'discard')).toEqual([
    { type: 'RemoveAssetFromGame', asset: '04311', leavingResolved: true },
  ])
  let t = startTest(
    during(setup('04311', { enemy: null, asset: { uses: 1 } }), sealedWith('04311', 'autoFail')),
  )
  t = reveal({ ...t, chaosBag: ['skull'] })
  expect(t.assets['04311']).toBeUndefined()
  expect(t.chaosBag).toContain('autoFail')
})

it('Bulwark cancels an attack, readies another asset and can seal again after a defeat', () => {
  let s = setup('11028', { enemy: ghoul })
  s = during(s, (x) => withAsset(sealedWith('11028', 'elderSign')(x), '07302', { exhausted: true }))
  s = untilReaction(s, 'ability.sealCancelAttack')
  s = choose(s, 'ability.sealCancelAttack', { card: name('11028'), enemy: ghoul.name })
  if (labels(s).includes('choice.sealReadyAsset'))
    s = choose(s, 'choice.sealReadyAsset', { card: name('07302') })
  expect(me(s).damage + me(s).horror).toBe(0)
  expect(s.chaosBag).toContain('elderSign')
  const again = playerCardBehavior('11028')!.reactions!(
    s,
    { type: 'enemyDefeated', enemy: Object.values(s.enemies)[0]!, by: 'a' },
    asset(s, '11028'),
  )
  expect(again.map((o) => o.label)).toEqual(['ability.sealAgain'])
  const limited = playerCardBehavior('11028')!.canPlay!({ ...s, chaosBag: ['elderSign'] }, 'a')
  expect(limited).toBe(false)
  const two = during(setup('11028', { enemy: null }), (x) =>
    withAsset(withAsset(x, '07302', { exhausted: true }), '07018', { exhausted: true }),
  )
  const ready = playerCardBehavior('11028')!.effect!(two, 'a', 'ready', { asset: '11028' })
  expect(choiceLabels(ready)).toEqual(['choice.sealReadyAsset', 'choice.sealReadyAsset'])
})

it('Misdirection cancels an attack and lets that investigator move', () => {
  let s = setup('11043', { enemy: ghoul })
  s = during(s, sealedWith('11043', 0))
  s = untilReaction(s, 'ability.sealCancelAttack')
  s = choose(s, 'ability.sealCancelAttack', { card: name('11043'), enemy: ghoul.name })
  expect(labels(s)).toContain('choice.skip')
  expect(me(s).damage + me(s).horror).toBe(0)
  const again = playerCardBehavior('11043')!.reactions!(
    { ...s, chaosBag: [1] },
    { type: 'afterDiscoverClues', investigator: 'a', location: me(s).location!, last: true },
    asset(s, '11043'),
  )
  expect(again.map((o) => o.label)).toEqual(['ability.sealAgain'])
})

it('Sign of Xelotaph spends a charge each turn and a copy in hand replenishes it', () => {
  let s = setup('11070', { enemy: null, asset: { uses: 1 } })
  const turn = forced(s, '11070', { type: 'turnBegins', investigator: 'a' })
  expect(choiceLabels(turn)).toEqual(['choice.sealKeepCharge', 'choice.discard'])
  const empty = during(s, (x) => ({
    ...x,
    assets: { ...x.assets, '11070': { ...asset(x, '11070'), uses: 0 } },
  }))
  expect(forced(empty, '11070', { type: 'turnBegins', investigator: 'a' })).toEqual([
    { type: 'DiscardAsset', asset: '11070' },
  ])
  s = during(s, patch({ hand: ['11070'] }))
  const [replenish] = playerCardBehavior('11070')!.fastOptions!(s, asset(s, '11070'))
  expect(replenish!.then).toEqual([
    { type: 'DiscardFromHand', investigator: 'a', card: '11070' },
    { type: 'AddUses', asset: '11070', amount: 2 },
  ])
})

// RR ST.3: "Before revealing chaos token(s) for this attack" is decided after committing cards,
// not when the ability is activated.
const bladeBless = (s: GameState, code: string, n: number) =>
  choose(s, 'ability.blessedBladeBless', { card: name(code), n })

it('Blessed Blade (0) may exhaust before revealing to add a bless token and needs to be ready', () => {
  let s = setup('07018')
  expect(labels(s)).not.toContain('ability.blessedBladeBless')
  s = choose(s, 'ability.fightWith', { card: name('07018') })
  s = bladeBless(s, '07018', 1)
  expect(asset(s, '07018').exhausted).toBe(true)
  expect(s.chaosBag).toContain('bless')
  expect(labels(s)).not.toContain('ability.blessedBladeBless')
  const kind = s.skillTest?.kind
  expect(kind?.type === 'fight' && kind.damageIfTokens).toEqual({
    tokens: ['bless', 'elderSign'],
    amount: 1,
  })
  const tired = setup('07018', { asset: { exhausted: true } })
  expect(availableAbilities(tired, 'a').some((o) => o.params?.card === name('07018'))).toBe(false)
})

it('Blessed Blade (4) adds 2 bless before revealing and returns revealed bless tokens', () => {
  let s = withHand(setup('10034'), ['07036'])
  s = choose(s, 'ability.fightWith', { card: name('10034') })
  s = choose(s, 'choice.commit', { card: name('07036') })
  s = bladeBless(s, '10034', 2)
  expect(count(s, 'bless')).toBe(2)
  let t = setup('10034')
  t = choose(t, 'ability.fightWith', { card: name('10034') })
  t = apply(reveal({ ...t, chaosBag: ['bless'] }))
  expect(count(t, 'bless')).toBe(1)
})

it('Blessed Blade (4) and Beloved return the same physical bless token only once', () => {
  let s = withHand(setup('10034'), ['07036'])
  s = choose(s, 'ability.fightWith', { card: name('10034') })
  s = choose(s, 'choice.commit', { card: name('07036') })
  s = reveal({ ...s, chaosBag: ['bless'] })
  s = choose(s, 'ability.tokenTrigger.07036', { card: name('07036') })
  expect(count(apply(s), 'bless')).toBe(1)
})

it('Hallow returns 10 bless tokens from the bag and sealed cards and removes 1 doom', () => {
  const nine = Array<ChaosToken>(9).fill('bless')
  const short = withHand(during(base(), bag(...nine)), ['07301'])
  expect(playerCardBehavior('07301')!.canPlay!(short, 'a')).toBe(false)
  let s = withAsset(withHand(during(base(), bag(...nine, 0)), ['07301']), '07221')
  s = during(s, (x) => ({ ...sealedWith('07221', 'bless')(x), doom: 2 }))
  s = play(s, '07301')
  expect(labels(s)).toContain('choice.hallowBlessFromBag')
  s = choose(s, 'choice.hallowBlessFromCard', { card: name('07221') })
  expect(count(s, 'bless')).toBe(0)
  expect(s.assets['07221']).toBeUndefined()
  expect(me(s).discard).toContain('07221')
  expect(s.doom).toBe(1)
})

it('Tides of Fate turns curse into bless tokens until the end of the round', () => {
  let s = withHand(during(base(), bag('curse', 'curse', 0)), ['07030'])
  s = choose(s, 'action.playFast', { card: name('07030') })
  expect([count(s, 'curse'), count(s, 'bless')]).toEqual([0, 2])
  expect(playerCardBehavior('07030')!.effect!(s, 'a', 'reverse', {})).toEqual([
    { type: 'RemoveChaosTokens', tokens: ['bless', 'bless'] },
    { type: 'AddChaosTokens', tokens: ['curse', 'curse'], scenarioOnly: true },
  ])
})

it('Tides of Fate can be played at the start of a round before the Mythos phase', () => {
  const ready = withHand(during(base(), bag('curse', 0)), ['07030'])
  const round = dispatch({ ...ready, pending: null, queue: [], round: 1 }, { type: 'Round' })
  expect(round.queue.some((message) => message.type === 'MythosPhase')).toBe(true)
  const played = choose(round, 'ability.playCard', { card: name('07030') })
  expect([count(played, 'curse'), count(played, 'bless')]).toEqual([0, 1])
})

it('Ríastrad adds up to 3 curse tokens for +1 combat and +1 damage each', () => {
  let s = setup('07018')
  s = withHand(s, ['07193'])
  s = play(s, '07193')
  s = choose(s, 'choice.addCurse', { n: 2 })
  if (s.pending && labels(s).includes('choice.enemy')) s = choose(s, 'choice.enemy')
  expect(count(s, 'curse')).toBe(2)
  const kind = s.skillTest?.kind
  expect(kind?.type === 'fight' && kind.extraDamage).toBe(2)
})

it('Guided by Faith adds 2 bless tokens and may investigate with willpower', () => {
  let s = withHand(base(), ['10025'])
  s = play(s, '10025')
  expect(count(s, 'bless')).toBe(2)
  s = choose(s, 'choice.test.willpower')
  expect(s.skillTest?.skill).toBe('willpower')
  expect(s.skillTest?.kind.type).toBe('investigate')
})
