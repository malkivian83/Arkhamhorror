// RR: Bonded, Set Aside, Heal, Uses, Swap, Triggered Abilities, Skill Tests ST.3–ST.8.
import { describe, expect, it } from 'vitest'
import {
  createGame,
  dispatch,
  playerCardBehavior,
  playerCardDef,
  type GameState,
  type Message,
  type Trigger,
} from '@lcg/engine'
import { choose, ghoul, labels, spawnAt, testInvestigator, testScenario } from '@lcg/engine/testing'
import { game, patch, withAsset, me } from '../dunwich-pilot/testing'
import { cardName } from '../advanced-tests/common'
import { cardPool, investigatorCards, isStandard, validateDeck } from '../decks'
import { newCampaign, purchaseOptions } from '../campaign'
import data from '../data/bonded-cards.json'
import './index'

const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const base = () => ({
  ...patch({ resources: 10, hand: [], deck: ['01088', '01088', '01088', '01088'] })(
    clear(game(['a', 'b'])),
  ),
  interactive: true,
})
const aside = (s: GameState, codes: string[], who = 'a') => patch({ outOfPlay: codes }, who)(s)
const behavior = (code: string) => playerCardBehavior(code)!
const run = (s: GameState, ...m: Message[]) => dispatch(clear(s), ...m)
const trigger = (s: GameState, t: Trigger) => run(s, { type: 'Forced', trigger: t })
const enter = (s: GameState, code: string) =>
  run(s, { type: 'PutAssetIntoPlay', investigator: 'a', code })
const assetOf = (s: GameState, code: string) =>
  Object.values(s.assets).find((a) => a.code === code)!
const react = (s: GameState, code: string) =>
  choose(s, 'ability.advancedTest', { card: cardName(code) })
const play = (s: GameState, code: string) =>
  run(patch({ hand: [...me(s).hand, code] })(s), { type: 'PlayCard', investigator: 'a', code })
const fast = (s: GameState, code: string, at = 0) => {
  const a = assetOf(s, code)
  return run(s, ...behavior(code).abilities!(s, a, 'a')[at]!.then)
}
const enemy = (s: GameState, overrides = {}) =>
  dispatch(s, spawnAt(me(s).location!, { ...ghoul, health: 8, ...overrides }, 'a'))
const count = (cards: string[], code: string) => cards.filter((c) => c === code).length

it.each(data)('$code is registered with its official level', (c) => {
  expect(behavior(c.code)).toBeDefined()
  expect(playerCardDef(c.code)?.xp).toBe(c.xp)
})

describe('RR Bonded (FAQ v1.7)', () => {
  it('sets aside each bonded card at setup, once per product count, outside the deck', () => {
    const s = createGame({
      seed: 3,
      scenario: testScenario(),
      investigators: [
        {
          ...testInvestigator('a'),
          deck: ['05313', '54002', '06112', '06112', '06236', '01088', '05314'],
        },
      ],
    })
    const a = s.investigators[0]!
    expect([...(a.outOfPlay ?? [])].sort()).toEqual(['05314', '05314', '05314', '06113'])
    expect([...a.deck, ...a.hand]).not.toContain('05314')
  })

  it('keeps bonded cards out of deck building, the card pool and purchases', () => {
    const guardian = investigatorCards().find((c) => c.class === 'guardian')!.code
    for (const code of ['05314', '05317', '06113', '10045', '06022', '06277']) {
      expect(playerCardDef(code)?.bondedCard).toBe(true)
      expect(isStandard(code)).toBe(false)
      expect(cardPool(guardian).some((c) => c.code === code)).toBe(false)
    }
    const { problems } = validateDeck({
      id: 'd',
      name: 'd',
      investigator: guardian,
      cards: ['05314'],
    })
    expect(problems.some((p) => p.key === 'deck.problem.notAllowed')).toBe(true)
    const c = newCampaign('night-of-the-zealot', ['rex'], 'standard', 3)
    const id = c.investigators[0]!.id
    const shop = purchaseOptions(
      {
        ...c,
        scenarioIndex: 1,
        log: { ...c.log, investigators: { [id]: { ...c.log.investigators[id]!, xp: 10 } } },
      },
      id,
    ).map((o) => o.code)
    expect(shop).toContain('05316')
    for (const code of ['05317', '06113', '10045', '06022']) expect(shop).not.toContain(code)
    expect(playerCardDef('05313')?.deckLimit).toBe(1)
    expect(playerCardDef('06021')).toMatchObject({ myriad: true, deckLimit: 3, fast: true })
  })
})

describe('Hallowed Mirror and Occult Lexicon', () => {
  it.each([
    ['05313', '05314'],
    ['05316', '05317'],
  ])('%s adds one copy to hand, shuffles two and sets them all aside when it leaves', (code, b) => {
    let s = enter(aside(base(), [b, b, b]), code)
    expect(count(me(s).hand, b)).toBe(1)
    expect(count(me(s).deck, b)).toBe(2)
    s = patch({ discard: [b], hand: me(s).hand.filter((c) => c !== b) })(s)
    s = run(s, { type: 'DiscardAsset', asset: assetOf(s, code).id })
    expect(count(me(s).outOfPlay ?? [], b)).toBe(3)
    expect([...me(s).hand, ...me(s).deck, ...me(s).discard]).not.toContain(b)
    expect(me(s).discard).toContain(code)
  })

  it.each([
    ['54002', '05314'],
    ['54004', '05317'],
  ])('%s (3) keeps its bonded copies in the game when it leaves play', (code, b) => {
    let s = enter(aside(base(), [b, b, b]), code)
    s = run(s, { type: 'ReturnAssetToHand', asset: assetOf(s, code).id })
    expect(count([...me(s).hand, ...me(s).deck], b)).toBe(3)
  })

  it('Soothing Melody heals 2 among investigators and Allies here, then draws 1', () => {
    let s = patch({ damage: 1, horror: 0 })(withAsset(base(), '01117', { horror: 2, owner: 'b' }))
    s = play(s, '05314')
    s = choose(s, 'choice.bonded.healDamage', { card: me(s).name })
    s = choose(s, 'choice.bonded.healHorror', { card: cardName('01117') })
    expect(me(s).damage).toBe(0)
    expect(s.assets['01117']!.horror).toBe(1)
    expect(me(s).hand).toEqual(['01088'])
    expect(me(s).discard).toContain('05314')
  })

  it('Hallowed Mirror (3) changes 2 to 3 or shuffles the Melody back instead', () => {
    let s = patch({ horror: 3 })(withAsset(base(), '54002'))
    s = choose(play(s, '05314'), 'choice.bonded.three')
    for (let n = 0; n < 3; n++) s = choose(s, 'choice.bonded.healHorror', { card: me(s).name })
    expect(me(s).horror).toBe(0)
    expect(count(me(s).discard, '05314')).toBe(1)
    s = choose(play(clear(s), '05314'), 'choice.bonded.shuffleBack')
    expect(count(me(s).discard, '05314')).toBe(1)
    expect(me(s).deck).toContain('05314')
  })

  it('Blood-Rite draws 2, discards up to 2 and pays each one off; it does not provoke', () => {
    expect(behavior('05317').noAttacksOfOpportunity).toBe(true)
    let s = enemy(patch({ resources: 1, hand: ['01088'] })(base()))
    const id = Object.keys(s.enemies)[0]!
    s = play(s, '05317')
    expect(me(s).hand).toHaveLength(3)
    s = choose(s, 'choice.discard', { card: cardName('01088') })
    s = choose(s, 'choice.bonded.riteDamage', { card: s.enemies[id]!.name })
    expect(s.enemies[id]!.damageTaken).toBe(1)
    expect(me(s).resources).toBe(0)
    s = choose(s, 'choice.discard', { card: cardName('01088') })
    expect(labels(s)).not.toContain('choice.bonded.riteDamage')
    s = choose(s, 'choice.bonded.riteResource')
    expect(me(s).resources).toBe(1)
    expect(me(s).hand).toHaveLength(1)
  })

  it('Occult Lexicon (3) lets Blood-Rite draw and discard 3', () => {
    let s = withAsset(patch({ hand: [] })(base()), '54004')
    s = choose(play(s, '05317'), 'choice.bonded.three')
    expect(me(s).hand).toHaveLength(3)
    for (let n = 0; n < 3; n++) {
      s = choose(s, 'choice.discard', { card: cardName('01088') })
      s = choose(s, 'choice.bonded.riteResource')
    }
    expect(me(s).hand).toHaveLength(0)
    expect(me(s).resources).toBe(13)
  })
})

describe('Dream Diary and Essence of the Dream', () => {
  it('Essence is set aside instead of entering the discard pile or the deck', () => {
    let s = patch({ hand: ['06113'] })(base())
    s = run(s, { type: 'DiscardFromHand', investigator: 'a', card: '06113' })
    expect(me(s).discard).not.toContain('06113')
    expect(me(s).outOfPlay).toEqual(['06113'])
    s = run(patch({ hand: ['06113'] })(s), {
      type: 'ShuffleCardsIntoDeck',
      investigator: 'a',
      cards: ['06113'],
      fromHand: true,
    })
    expect(me(s).deck).not.toContain('06113')
    expect(count(me(s).outOfPlay ?? [], '06113')).toBe(2)
  })

  it('Dream Diary searches for Essence; the upgrades do so when the turn begins', () => {
    let s = withAsset(aside(base(), ['06113']), '06112')
    const ability = behavior('06112').abilities!(s, s.assets['06112']!, 'a')[0]!
    expect(ability.actions).toBe(1)
    s = run(s, ...ability.then)
    expect(me(s).hand).toEqual(['06113'])
    expect(behavior('06112').abilities!(s, s.assets['06112']!, 'a')).toHaveLength(0)
    s = trigger(withAsset(aside(base(), ['06113']), '06237'), {
      type: 'turnBegins',
      investigator: 'a',
    })
    s = react(s, '06237')
    expect(me(s).hand).toEqual(['06113'])
    expect(behavior('06236').requiredResearch).toBe('interpretedTheDreams')
  })

  it.each([
    ['06236', (s: GameState) => s],
    ['06237', (s: GameState) => enemy(s)],
    ['06238', (s: GameState) => patch({ hand: Array<string>(8).fill('01088') })(s)],
  ] as const)('%s gives Essence [wild][wild] only under its condition', (code, condition) => {
    let s = withAsset(base(), code)
    const icons = (x: GameState) =>
      behavior('06113').additionalIcons!(x, x.skillTest!, 'a', 'committed')
    const test = (x: GameState) =>
      run(x, {
        type: 'BeginSkillTest',
        investigator: 'a',
        skill: 'willpower',
        difficulty: 1,
        kind: { type: 'effect', source: 't', onSuccess: [], onFail: [], onFailEach: [] },
      })
    if (code === '06236') {
      const here = me(s).location!
      expect(icons(test(s))).toEqual({})
      s = { ...s, locations: { ...s.locations, [here]: { ...s.locations[here]!, shroud: 4 } } }
    } else expect(icons(test(s))).toEqual({})
    expect(icons(test(condition(s)))).toEqual({ wild: 2 })
  })

  it('Dream Diary records the dreams after succeeding by 3 with Essence committed', () => {
    let s = withAsset(patch({ hand: ['06113'] })(base()), '06112')
    s = {
      ...s,
      campaignLog: { notes: [], crossedOut: [], values: {}, chaosTokens: [], investigators: {} },
    }
    s = run(s, {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'willpower',
      difficulty: 1,
      kind: { type: 'effect', source: 't', onSuccess: [], onFail: [], onFailEach: [] },
    })
    s = choose(s, 'choice.commit', { card: cardName('06113') })
    s = choose({ ...s, chaosBag: [0] }, 'choice.revealToken')
    s = react(s, '06112')
    expect(s.campaignLog?.notes).toContain('interpretedTheDreams')
    while (s.pending && labels(s).includes('choice.applyResults'))
      s = choose(s, 'choice.applyResults')
    expect(me(s).discard).not.toContain('06113')
    expect(me(s).outOfPlay).toContain('06113')
  })
})

describe('Ravenous Myconid and Uncanny Growth', () => {
  const investigate = (s: GameState, token: number) => {
    let x = play(withAsset(aside(s, ['10045']), '10044'), '10045')
    const here = me(x).location!
    x = { ...x, locations: { ...x.locations, [here]: { ...x.locations[here]!, clues: 2 } } }
    x = choose({ ...x, chaosBag: [token] }, 'choice.revealToken')
    while (x.pending && labels(x).includes('choice.applyResults'))
      x = choose(x, 'choice.applyResults')
    return x
  }

  it('searches its bonded Growth; success places growth per point and sets it aside', () => {
    let s = withAsset(aside(base(), ['10045']), '10044')
    s = run(s, ...behavior('10044').abilities!(s, s.assets['10044']!, 'a')[0]!.then)
    expect(me(s).hand).toEqual(['10045'])
    s = investigate(base(), 2)
    expect(s.assets['10044']!.uses).toBeGreaterThan(0)
    expect(me(s).outOfPlay).toContain('10045')
    expect(me(s).discard).not.toContain('10045')
  })

  it('returns Uncanny Growth to hand when the investigation fails', () => {
    const s = investigate(base(), -9)
    expect(me(s).hand).toContain('10045')
    expect(s.assets['10044']!.uses).toBe(0)
  })

  it('moves 3 or more growth to resources and records the new species', () => {
    let s = withAsset(base(), '10044', { uses: 3 })
    s = {
      ...s,
      campaignLog: { notes: [], crossedOut: [], values: {}, chaosTokens: [], investigators: {} },
    }
    const harvest = behavior('10044').abilities!(s, s.assets['10044']!, 'a')
    expect(harvest).toHaveLength(1)
    s = run(s, ...harvest[0]!.then)
    expect(me(s).resources).toBe(13)
    expect(s.assets['10044']!.uses).toBe(0)
    expect(s.campaignLog?.notes).toContain('classifiedNewSpecies')
  })
})

describe('Segment of Onyx and Pendant of the Queen', () => {
  const three = (s: GameState) =>
    ['s1', 's2', 's3'].reduce((x, id) => withAsset(x, id, { code: '06021' }), s)

  it('three Segments become the Pendant; its last charge turns it back into Segments', () => {
    let s = three(aside(base(), ['06022']))
    expect(behavior('06021').abilities!(s, s.assets['s2']!, 'a')).toHaveLength(0)
    expect(behavior('06021').fastOptions!(s, s.assets['s1']!)).toHaveLength(1)
    s = run(s, ...behavior('06021').abilities!(s, s.assets['s1']!, 'a')[0]!.then)
    expect(Object.values(s.assets).filter((a) => a.code === '06021')).toHaveLength(0)
    expect(assetOf(s, '06022').uses).toBe(3)
    expect(count(me(s).outOfPlay ?? [], '06021')).toBe(3)
    s = run(s, { type: 'SpendUses', asset: assetOf(s, '06022').id, amount: 2 })
    s = fast(s, '06022')
    s = choose(s, labels(s)[0]!)
    expect(Object.values(s.assets).some((a) => a.code === '06022')).toBe(false)
    expect(count(me(s).deck, '06021')).toBe(3)
    expect(me(s).outOfPlay).toEqual(['06022'])
  })

  it('Pendant moves to, discovers at, or automatically evades at a revealed location', () => {
    let s = enemy(aside(base(), ['06022']))
    s = run(s, { type: 'TakeSetAside', investigator: 'a', code: '06022', count: 1, to: 'play' })
    const here = me(s).location!
    s = { ...s, locations: { ...s.locations, [here]: { ...s.locations[here]!, clues: 1 } } }
    s = fast(s, '06022')
    const id = Object.keys(s.enemies)[0]!
    s = choose(s, 'choice.bonded.pendantEvade', { card: s.enemies[id]!.name })
    expect(s.enemies[id]).toMatchObject({ exhausted: true, engagedWith: null })
    expect(assetOf(s, '06022')).toMatchObject({ exhausted: true, uses: 2 })
    s = run(s, { type: 'ReadyAsset', asset: assetOf(s, '06022').id })
    s = choose(fast(s, '06022'), 'choice.bonded.pendantClue', {
      location: s.locations[here]!.name,
    })
    expect(me(s).clues).toBe(1)
  })
})

describe('Empty Vessel and Wish Eater', () => {
  it('charges on defeats, then swaps with Wish Eater moving every charge', () => {
    let s = withAsset(aside(base(), ['06277']), '06276')
    expect(behavior('06276').abilities!(s, s.assets['06276']!, 'a')).toHaveLength(0)
    s = trigger(s, { type: 'enemyDefeated', enemy: { ...ghoul, id: 'x' } as never, by: 'a' })
    s = react(s, '06276')
    expect(s.assets['06276']!.uses).toBe(1)
    s = run(s, { type: 'AddUses', asset: '06276', amount: 2 })
    s = fast(s, '06276')
    expect(s.assets['06276']).toBeUndefined()
    expect(assetOf(s, '06277').uses).toBe(3)
    expect(me(s).outOfPlay).toEqual(['06276'])
  })

  it('Wish Eater cancels a symbol token, heals and swaps back without charges', () => {
    let s = aside(patch({ damage: 1, horror: 1 })(base()), ['06276'])
    s = enter(s, '06277')
    s = run(s, { type: 'AddUses', asset: assetOf(s, '06277').id, amount: 1 })
    s = run(s, {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'willpower',
      difficulty: 1,
      kind: { type: 'effect', source: 't', onSuccess: [], onFail: [], onFailEach: [] },
    })
    s = choose({ ...s, chaosBag: ['skull'] }, 'choice.revealToken')
    s = react(s, '06277')
    expect(me(s)).toMatchObject({ damage: 0, horror: 0 })
    expect(Object.values(s.assets).some((a) => a.code === '06277')).toBe(false)
    expect(assetOf(s, '06276').uses).toBe(0)
    expect(me(s).outOfPlay).toEqual(['06277'])
  })

  it('Wish Eater ignores other tokens', () => {
    let s = enter(base(), '06277')
    s = run(s, { type: 'AddUses', asset: assetOf(s, '06277').id, amount: 1 })
    s = run(s, {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'willpower',
      difficulty: 1,
      kind: { type: 'effect', source: 't', onSuccess: [], onFail: [], onFailEach: [] },
    })
    s = choose({ ...s, chaosBag: ['autoFail'] }, 'choice.revealToken')
    expect(labels(s)).not.toContain('ability.advancedTest')
  })
})
