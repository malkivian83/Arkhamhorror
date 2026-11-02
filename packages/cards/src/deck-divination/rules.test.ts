// RR: Look, Decks, Costs, Abilities, Doom, Horror, Draw.
import { expect, it } from 'vitest'
import { applyInput, dispatch, playerCardBehavior, type GameState, type Message } from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { game, patch, me, withAsset } from '../dunwich-pilot/testing'
import './index'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const start = () =>
  patch({
    deck: ['01088', '01089', '01090', '01088', '01091', '01092', '01093'],
    hand: [],
    discard: [],
    horror: 0,
  })(clear(game(['a', 'b'])))
const effect = (
  s: GameState,
  code: string,
  step: string,
  data: Record<string, string | number | boolean> = {},
) => dispatch(clear(s), { type: 'PlayerCardEffect', code, investigator: 'a', step, data })
const run = (s: GameState, ms: Message[]) => ms.reduce((a, m) => dispatch(clear(a), m), s)
const b = (code: string) => playerCardBehavior(code)!
const order = (s: GameState, names: string[]) =>
  names.reduce((s, card, n) => choose(s, 'choice.divinationNext', { card, n: n + 1 }), s)
const encounter = (s: GameState): GameState => ({
  ...s,
  encounterDeck: [
    { kind: 'treachery', code: 'test-omen', name: 'Omen', traits: ['Omen'], keywords: [] },
    { kind: 'treachery', code: 'test-terror', name: 'Terror', traits: ['Terror'], keywords: [] },
    { kind: 'treachery', code: 'test-safe', name: 'Safe', traits: [], keywords: [] },
    { kind: 'treachery', code: 'test-rest', name: 'Rest', traits: [], keywords: [] },
  ],
})
it.each(['01061', '03236'])(
  '%s inspects another player deck without drawing or searching, preserves duplicates and untouched tail',
  (code) => {
    let s = withAsset(patch({ deck: ['01088', '01089', '01088', '01090'] }, 'b')(start()), code)
    const before = s.investigators[1]!
    s = effect(s, code, 'target')
    s = choose(s, 'choice.divinationDeck', { name: 'B' })
    expect(s.investigators[1]!.deck).toEqual(before.deck)
    const choices = s.pending!.question.choices
    expect(choices).toHaveLength(3)
    // Distinct physical positions remain selectable even when printed names match.
    s = applyInput(s, { investigator: s.pending!.investigator, choice: 2 })
    s = applyInput(s, { investigator: s.pending!.investigator, choice: 1 })
    s = applyInput(s, { investigator: s.pending!.investigator, choice: 0 })
    expect(s.investigators[1]!.deck).toEqual(['01088', '01089', '01088', '01090'])
    expect(s.investigators[1]!.hand).toEqual(before.hand)
    expect(s.investigators[1]!.discard).toEqual(before.discard)
    expect(s.rng).toEqual(start().rng)
  },
)
it('Scrying 0 pays one action, exhaust and charge; level 3 has a fast exhaust/charge option', () => {
  for (const code of ['01061', '03236']) {
    let s = withAsset(start(), code)
    const a = s.assets[code]!
    if (code === '01061') {
      const option = b(code).abilities!(s, a, 'a')[0]!
      expect(option).toMatchObject({ actions: 1, provokes: true })
      s = run(s, [...(option.costs ?? []), ...option.then])
    } else s = run(s, b(code).fastOptions!(s, a)[0]!.then)
    expect(s.assets[code]).toMatchObject({ uses: 2, exhausted: true })
    expect(
      code === '01061'
        ? b(code).abilities!(s, s.assets[code]!, 'a')
        : b(code).fastOptions!(s, s.assets[code]!),
    ).toEqual([])
    s = withAsset(s, code, { uses: 0, exhausted: false })
    expect(
      code === '01061'
        ? b(code).abilities!(s, s.assets[code]!, 'a')
        : b(code).fastOptions!(s, s.assets[code]!),
    ).toEqual([])
  }
})
it.each(['01061', '03236'])(
  '%s reorders encounter cards; the upgrade inflicts only one horror for multiple Omen/Terror cards',
  (code) => {
    let s = effect(encounter(start()), code, 'peek', { who: '' })
    s = order(s, ['Safe', 'Omen', 'Terror'])
    expect(s.encounterDeck.map((c) => c.name)).toEqual(['Safe', 'Omen', 'Terror', 'Rest'])
    if (
      code === '03236' &&
      s.pending?.question.choices.some((c) => c.label === 'choice.investigatorDamage')
    ) {
      // Assignment is handled through the engine; inspect its pending horror as well.
      expect(s.pending).toBeDefined()
    } else expect(me(s).horror).toBe(code === '03236' ? 1 : 0)
  },
)
it('Scrying 3 does not take horror for safe cards or an Omen below the looked-at window', () => {
  let s = encounter(start())
  s.encounterDeck.reverse()
  s = effect(s, '03236', 'peek', { who: '', count: 1 })
  s = order(s, ['Rest'])
  expect(me(s).horror).toBe(0)
})
it('Alyssa looks without cost in doom when declined, or buries that physical top card for one doom without advancing', () => {
  let s = withAsset(encounter(start()), '02232')
  const bonus = b('02232').skillModifier!
  expect(
    bonus(s, s.assets['02232']!, { skill: 'intellect' } as NonNullable<GameState['skillTest']>),
  ).toBe(1)
  const initial = s.encounterDeck,
    agenda = s.agendas
  s = effect(s, '02232', 'peek', { who: '', asset: '02232' })
  s = choose(s, 'choice.skip')
  expect(s.encounterDeck).toEqual(initial)
  expect(s.assets['02232']!.doom ?? 0).toBe(0)
  s = effect(s, '02232', 'peek', { who: '', asset: '02232' })
  s = choose(s, 'choice.divinationBury')
  expect(s.encounterDeck.map((c) => c.name)).toEqual(['Terror', 'Safe', 'Rest', 'Omen'])
  expect(s.assets['02232']!.doom).toBe(1)
  expect(s.agendas).toEqual(agenda)
})
it.each([0, 'elderSign', 'skull', 'cultist', 'tablet', 'elderThing', 'autoFail'] as const)(
  'Parallel Fates 0 uses the revealed %s token and keeps it in the bag',
  (token) => {
    let s: GameState = { ...encounter(start()), chaosBag: [token] }
    const bag = [...s.chaosBag],
      before = s.encounterDeck
    s = effect(s, '60415', 'peek')
    expect(s.chaosBag).toEqual(bag)
    if (token === 0 || token === 'elderSign') {
      expect(s.pending!.question.choices).toHaveLength(4)
      s = order(s, ['Rest', 'Safe', 'Terror', 'Omen'])
      expect(s.encounterDeck.map((c) => c.name)).toEqual(['Rest', 'Safe', 'Terror', 'Omen'])
    } else {
      expect(s.encounterDeck.map((c) => c.code).sort()).toEqual(before.map((c) => c.code).sort())
      expect(s.encounterDeck).not.toEqual(before)
    }
    expect(me(s).hand).toEqual([])
    expect(s.chaosBag).toEqual(bag)
  },
)
it('Parallel Fates 2 offers six cards, then the deck owner decides whether to draw', () => {
  let s = effect(start(), '08066', 'peek', { who: 'a' })
  s = choose(s, 'choice.divinationOrder')
  expect(s.pending!.question.choices).toHaveLength(6)
  while (s.pending?.question.choices[0]?.label === 'choice.divinationNext')
    s = applyInput(s, { investigator: s.pending!.investigator, choice: 0 })
  expect(me(s).hand).toEqual([])
  s = choose(s, 'choice.divinationDraw')
  expect(me(s).hand).toEqual(['01088'])
  expect(me(s).deck).toHaveLength(6)
})
it('Parallel Fates 2 allows a remote owner to decline the draw after shuffling their whole deck', () => {
  let s = effect(start(), '08066', 'peek', { who: 'b' })
  const before = s.investigators[1]!.deck
  s = choose(s, 'choice.divinationShuffle')
  expect(s.pending!.investigator).toBe('b')
  s = choose(s, 'choice.skip')
  expect(s.investigators[1]!.deck.slice().sort()).toEqual(before.slice().sort())
  expect(s.investigators[1]!.hand).toEqual(start().investigators[1]!.hand)
})
it('Parallel Fates 2 never offers a draw after inspecting the encounter deck', () => {
  let s = effect(encounter(start()), '08066', 'peek', { who: '' })
  s = choose(s, 'choice.divinationShuffle')
  expect(
    s.pending?.question.choices.some((c) => c.label === 'choice.divinationDraw') ?? false,
  ).toBe(false)
})
it('short decks remain short and invalid permutations never duplicate, remove or read cards beyond the window', () => {
  let s = patch({ deck: ['01088', '01089'] })(start())
  const before = me(s).deck
  for (const indices of [[0, 0], [0, 2], [0], [-1, 1]]) {
    s = dispatch(clear(s), { type: 'ReorderDeck', investigator: 'a', count: 2, order: indices })
    expect(me(s).deck).toEqual(before)
  }
  s = effect(s, '01061', 'peek', { who: 'a' })
  expect(s.pending!.question.choices).toHaveLength(2)
  s = applyInput(s, { investigator: s.pending!.investigator, choice: 1 })
  s = applyInput(s, { investigator: s.pending!.investigator, choice: 0 })
  expect(me(s).deck).toEqual(before.slice().reverse())
  expect(me(s).discard).toEqual([])
})
