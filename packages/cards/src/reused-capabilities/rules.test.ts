// RR: Chaos Bag (Bless/Curse tokens), Healing, Resources, Uses (charges), Fast, Triggered
// Abilities, Exceptional, Skill Tests, Fight, Enemy Movement, Limits.
import { describe, expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  playerCardDef,
  usesLenders,
  type ChaosToken,
  type GameState,
  type Message,
  type Trigger,
} from '@lcg/engine'
import { choose, during, ghoul, labels, spawnAt } from '@lcg/engine/testing'
import { game, patch, withAsset } from '../dunwich-pilot/testing'
import { name } from '../basic-abilities/testing'
import data from '../data/reused-capabilities.json'
import './index'

const who = (s: GameState, id = 'a') => s.investigators.find((i) => i.id === id)!
const count = (s: GameState, token: ChaosToken) => s.chaosBag.filter((t) => t === token).length
const base = (players?: string[]) =>
  during({ ...game(players), interactive: true }, patch({ resources: 5, hand: [] }))
const run = (s: GameState, ...messages: Message[]) => during(s, (x) => x, ...messages)
const fast = (s: GameState, code: string) =>
  playerCardBehavior(code)!.fastOptions!(s, s.assets[code]!)
const play = (s: GameState, code: string) =>
  choose(during(s, patch({ hand: [code], resources: 5 })), 'action.play', { card: name(code) })
const effect = (s: GameState, code: string, step: string, data: Record<string, string> = {}) =>
  run(s, { type: 'PlayerCardEffect', code, investigator: 'a', step, data })

it('registers the seven reviewed cards with their printed statistics', () => {
  expect(data.map((c) => c.code).sort()).toEqual(
    ['04035', '07308', '08053', '08093', '10072', '10104', '11078'].sort(),
  )
  for (const c of data) expect(playerCardBehavior(c.code), c.code).toBeDefined()
  expect(playerCardDef('08053')).toMatchObject({ exceptional: true, deckLimit: 1, xp: 2 })
  expect(playerCardDef('08093')!.classes).toEqual(['guardian', 'mystic'])
})

describe('The Key of Solomon (4)', () => {
  const key = (bag: ChaosToken[], damage = 2) =>
    withAsset(
      during(base(), (s) => ({ ...s, chaosBag: bag }), {
        type: 'TakeDamage',
        investigator: 'a',
        damage,
        horror: 1,
      }),
      '10104',
    )
  it('with more Bless, removes 1 Bless and exhausts to heal up to 2 damage and/or horror', () => {
    let s = key(['bless', 'bless', 'curse'])
    const options = fast(s, '10104')
    expect(options.map((o) => o.label)).toEqual(['choice.keyOfSolomonHeal'])
    s = run(s, ...options[0]!.then)
    expect(count(s, 'bless')).toBe(1)
    expect(s.assets['10104']!.exhausted).toBe(true)
    s = choose(s, 'choice.protectionHeal', { damage: 1, horror: 1 })
    expect(who(s)).toMatchObject({ damage: 1, horror: 0 })
    expect(fast(s, '10104')).toEqual([])
  })
  it('with more Curse, removes 1 Curse and exhausts to gain 2 resources', () => {
    let s = key(['curse', 'curse', 'bless'])
    const options = fast(s, '10104')
    expect(options.map((o) => o.label)).toEqual(['choice.keyOfSolomonGain'])
    s = run(s, ...options[0]!.then)
    expect(count(s, 'curse')).toBe(1)
    expect(who(s).resources).toBe(7)
  })
  it('offers nothing with equal counts, or healing with nothing to heal', () => {
    expect(fast(key(['bless', 'curse']), '10104')).toEqual([])
    expect(fast(withAsset(base(), '10104', { exhausted: false }), '10104')).toEqual([])
  })
})

describe('Rite of Equilibrium (5)', () => {
  it('adds X Curse to add X Bless', () => {
    let s = play(base(), '07308')
    s = choose(s, 'choice.equilibriumAdd', { n: 2 })
    expect([count(s, 'curse'), count(s, 'bless')]).toEqual([2, 2])
  })
  it('removes X of each to heal X horror from cards at your location', () => {
    let s = during(
      base(['a', 'b']),
      (s) => withAsset({ ...s, chaosBag: ['bless', 'bless', 'curse', 'curse', 0] }, '01048'),
      { type: 'TakeDamage', investigator: 'b', damage: 0, horror: 2 },
    )
    s = { ...s, assets: { ...s.assets, '01048': { ...s.assets['01048']!, horror: 1 } } }
    s = play(s, '07308')
    s = choose(s, 'choice.equilibriumHeal', { n: 2 })
    expect(s.chaosBag).toEqual([0])
    s = choose(s, 'choice.healHorrorOf', { name: 'B' })
    s = choose(s, 'choice.healHorrorOf', { name: name('01048') })
    expect(who(s, 'b').horror).toBe(1)
    expect(s.assets['01048']!.horror).toBe(0)
  })
  it('cannot be played without tokens to remove or room in the token pool', () => {
    const full = (s: GameState): GameState => ({
      ...s,
      chaosBag: [...Array<ChaosToken>(10).fill('curse')],
    })
    const s = during(base(), full)
    expect(labels(during(s, patch({ hand: ['07308'] })))).not.toContain('action.play')
  })
})

describe('"I\'ll Pay You Back!" (0)', () => {
  it('moves all resources of another investigator at your location, and back at round end', () => {
    let s = during(base(['a', 'b']), patch({ resources: 4 }, 'b'))
    s = choose(during(s, patch({ hand: ['10072'], resources: 1 })), 'action.playFast', {
      card: name('10072'),
    })
    s = choose(s, 'choice.payBackTake', { name: 'B', n: 4 })
    expect([who(s).resources, who(s, 'b').resources]).toEqual([5, 0])
    expect(s.endOfRound).toMatchObject([
      {
        type: 'PlayerCardEffect',
        code: '10072',
        investigator: 'a',
        step: 'repay',
        data: { to: 'b' },
      },
    ])
    s = effect({ ...s, endOfRound: [] }, '10072', 'repay', { to: 'b' })
    expect([who(s).resources, who(s, 'b').resources]).toEqual([0, 5])
  })
  it('is played only during your turn and needs another investigator at your location', () => {
    const behavior = playerCardBehavior('10072')!
    const s = base(['a', 'b'])
    expect(behavior.canPlay!(s, 'a')).toBe(true)
    expect(behavior.canPlay!(s, 'b')).toBe(false)
    expect(behavior.canPlay!(during(s, patch({ location: 'B' }, 'b')), 'a')).toBe(false)
  })
})

describe('Lost Arcana (3)', () => {
  it('lends its charges to Spell assets you control', () => {
    const s = withAsset(withAsset(base(), '11078'), '01060', { uses: 0 })
    expect(usesLenders(s, s.assets['01060']!).map((a) => a.code)).toEqual(['11078'])
    expect(usesLenders(s, s.assets['11078']!)).toEqual([])
  })
  it('exhausts to place 1 charge after the last clue is discovered from your location', () => {
    let s = withAsset(base(), '11078', { uses: 1 })
    const react = (t: Trigger) => playerCardBehavior('11078')!.reactions!(s, t, s.assets['11078']!)
    const last: Trigger = {
      type: 'afterDiscoverClues',
      investigator: 'a',
      location: 'A',
      last: true,
    }
    expect(react({ ...last, last: false })).toEqual([])
    expect(react({ ...last, location: 'B' })).toEqual([])
    s = run(s, ...react(last)[0]!.then)
    expect(s.assets['11078']).toMatchObject({ uses: 2, exhausted: true })
  })
})

describe('The Red Clock (2)', () => {
  const turn = (s: GameState) =>
    run(
      s,
      ...playerCardBehavior('08053')!.forced!(
        s,
        { type: 'turnBegins', investigator: 'a' },
        s.assets['08053']!,
      ),
    )
  it('places 1 charge: exactly 1 gives +3 to the next skill test', () => {
    const s = turn(withAsset(base(), '08053'))
    expect(s.assets['08053']!.uses).toBe(1)
    expect(who(s).nextTestBonus).toBe(3)
  })
  it('exactly 2 charges let you move up to 2 times; exactly 3 give 1 additional action', () => {
    let s = turn(withAsset(base(), '08053', { uses: 1 }))
    s = choose(s, 'choice.redClockPlace')
    expect(s.pending!.question.prompt).toBe('prompt.chooseMove')
    s = choose(s, 'action.move', { location: 'Room B' })
    s = choose(s, 'action.move', { location: 'Room C' })
    expect(who(s).location).toBe('C')
    const before = who(s).actionsRemaining
    s = choose(turn(s), 'choice.redClockPlace')
    expect(who(s).actionsRemaining).toBe(before + 1)
  })
  it('taking all charges as resources places none and triggers no bonus', () => {
    let s = turn(withAsset(base(), '08053', { uses: 2 }))
    s = choose(s, 'choice.redClockTake', { n: 2 })
    expect(s.assets['08053']!.uses).toBe(0)
    expect(who(s).resources).toBe(7)
    expect(who(s).nextTestBonus).toBeUndefined()
  })
})

describe('Yaotl (1)', () => {
  const skillTest: Message = {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'combat',
    difficulty: 3,
    kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
  }
  it('during your test, exhausts for +1 per matching icon on the top card of your discard', () => {
    // Top card with [combat] icons (01025).
    const top = '01025'
    const icons = playerCardDef(top)!.icons!.combat!
    let s = run(withAsset(during(base(), patch({ discard: ['01089', top] })), '04035'), skillTest)
    const bonus = fast(s, '04035').find((o) => o.label === 'ability.exhaustForBonus')!
    expect(bonus.params).toMatchObject({ amount: icons })
    const before = s.skillTest!.baseModifier
    s = dispatch({ ...s, pending: null }, ...bonus.then)
    expect(s.assets['04035']!.exhausted).toBe(true)
    expect(s.skillTest!.baseModifier).toBe(before + icons)
  })
  it('offers no bonus outside your tests or without matching icons', () => {
    const s = withAsset(during(base(), patch({ discard: ['01025'] })), '04035')
    expect(fast(s, '04035').map((o) => o.label)).toEqual(['choice.yaotlDiscard'])
  })
  it('discards the top card of your deck, limited to once per phase', () => {
    const s = withAsset(during(base(), patch({ deck: ['01088', '01089'] })), '04035')
    const mill = fast(s, '04035').find((o) => o.label === 'choice.yaotlDiscard')!
    expect(mill.limit).toEqual({ per: 'phase' })
    const after = run(s, ...mill.then)
    expect(who(after).deck).toEqual(['01089'])
    expect(who(after).discard.at(-1)).toBe('01088')
  })
})

describe('Cyclopean Hammer (5)', () => {
  const armed = () =>
    during(
      base(),
      (s) =>
        withAsset(
          patch({ skills: { willpower: 4, intellect: 1, combat: 1, agility: 1 } })(s),
          '08093',
        ),
      spawnAt('A', { ...ghoul, health: 10, fight: 4 }, 'a'),
    )
  const swing = (s: GameState) => {
    const [o] = playerCardBehavior('08093')!.abilities!(s, s.assets['08093']!, 'a')
    return o!
  }
  it('adds [willpower] to the attack and deals +1 damage', () => {
    const option = swing(armed())
    const begin = option.then[0] as Extract<Message, { type: 'BeginSkillTest' }>
    expect(begin.skill).toBe('combat')
    expect(begin.modifier).toBe(4)
    expect(begin.kind).toMatchObject({
      extraDamage: 1,
      damageIfSuccessBy: { atLeast: 3, amount: 1 },
    })
  })
  it('on success may move the non-Elite enemy one location away (two if by 3 or more)', () => {
    let s = armed()
    const enemy = Object.keys(s.enemies)[0]!
    s = effect(s, '08093', 'push', { enemy })
    expect(labels(s)).toEqual(['choice.skip', 'choice.moveEnemyTo'])
    s = choose(s, 'choice.moveEnemyTo', { location: 'Room B' })
    expect(s.enemies[enemy]).toMatchObject({ location: 'B', engagedWith: null })
  })
  it('does not move Elite enemies', () => {
    let s = during(base(), (x) => x, spawnAt('A', { ...ghoul, traits: ['Elite'] }, 'a'))
    s = effect(withAsset(s, '08093'), '08093', 'push', { enemy: Object.keys(s.enemies)[0]! })
    expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
  })
})
