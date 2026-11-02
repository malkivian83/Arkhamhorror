// RR: Look, Limbo, Ownership and Control, Revelation, Weakness, Costs.
import { expect, it } from 'vitest'
import { dispatch, playerCardBehavior, playerCardDef, type GameState } from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { game, patch, me, withAsset } from '../dunwich-pilot/testing'
import './index'
const start = (code: string, deck = ['01088', '01089', '01090', '01091']) =>
  withAsset(
    patch({ deck, hand: [], discard: [], horror: 0 })({
      ...game(['a', 'b']),
      pending: null,
      queue: [],
    }),
    code,
  )
const inspect = (s: GameState, code: string, who = 'a', bottom = true) => {
  const option = playerCardBehavior(code)!.abilities!(s, s.assets[code]!, 'a').find(
    (o) => o.key === `${code}:${who || 'encounter'}:${bottom}`,
  )!
  expect(option).toMatchObject({ actions: 1, provokes: true })
  return dispatch(s, ...(option.costs ?? []), ...option.then)
}
const name = (code: string) => playerCardDef(code)!.name
it.each(['05116', '05188', '05189'])(
  '%s spends an action ability, exhausts and spends the correct secret pool',
  (code) => {
    let s = start(code)
    expect(s.assets[code]!.uses).toBe(code === '05189' ? 4 : 3)
    s = inspect(s, code)
    expect(s.assets[code]).toMatchObject({ exhausted: true, uses: code === '05189' ? 3 : 2 })
    expect(playerCardBehavior(code)!.abilities!(s, s.assets[code]!, 'a')).toEqual([])
    const empty = withAsset({ ...s, pending: null, queue: [] }, code, { uses: 0, exhausted: false })
    expect(playerCardBehavior(code)!.abilities!(empty, empty.assets[code]!, 'a')).toEqual([])
  },
)
it.each(['05116', '05189'])(
  '%s can discard a bottom weakness without resolving it or drawing anything',
  (code) => {
    let s = inspect(start(code, ['01088', '01015']), code)
    s = choose(s, 'choice.scrollDiscard')
    expect(me(s)).toMatchObject({ deck: ['01088'], hand: [], discard: ['01015'], horror: 0 })
  },
)
it.each(['05116', '05189'])('%s adds a looked-at card without triggering Serum drawing', (code) => {
  let s = withAsset(patch({ hand: ['01088'] })(start(code, ['01089', '01088'])), '06159')
  s = inspect(s, code)
  s = choose(s, 'choice.scrollHand')
  expect(me(s).hand).toEqual(['01088', '01088'])
  expect(s.assets['06159']!.exhausted).toBe(false)
  expect(me(s).deck).toEqual(['01089'])
})
it.each(['05116', '05189'])(
  '%s resolves a weakness immediately when added to its owner’s hand',
  (code) => {
    let s = patch({ discard: ['01088'] })(start(code, ['01089', '01015']))
    s = inspect(s, code)
    s = choose(s, 'choice.scrollHand')
    expect(me(s).horror).toBe(2)
    expect(me(s).hand).toEqual([])
    expect(me(s).discard).not.toContain('01088')
    expect(me(s).deck).toEqual(['01089'])
  },
)
it('the Mystic upgrade can choose the top; the original only looks at the bottom', () => {
  let s = start('05189')
  expect(
    playerCardBehavior('05116')!.abilities!(
      start('05116'),
      start('05116').assets['05116']!,
      'a',
    ).some((o) => o.key.endsWith(':false')),
  ).toBe(false)
  s = inspect(s, '05189', 'a', false)
  s = choose(s, 'choice.scrollBottom')
  expect(me(s).deck).toEqual(['01089', '01090', '01091', '01088'])
})
it('a bottom card can go on top without shuffling the other cards', () => {
  const initial = start('05116')
  let s = inspect(initial, '05116')
  s = choose(s, 'choice.scrollTop')
  expect(me(s).deck).toEqual(['01091', '01088', '01089', '01090'])
  expect(s.rng).toEqual(initial.rng)
})
it('the Seeker upgrade discards one, adds one and returns the third, in that order', () => {
  let s = start('05188', ['01091', '01088', '01089', '01090'])
  s = inspect(s, '05188')
  expect(me(s).deck).toEqual(['01091'])
  s = choose(s, 'choice.scrollDiscard', { card: name('01088') })
  expect(me(s).discard).toEqual(['01088'])
  s = choose(s, 'choice.scrollHand', { card: name('01089') })
  expect(me(s).hand).toEqual(['01089'])
  s = choose(s, 'choice.scrollTop')
  expect(me(s).deck).toEqual(['01090', '01091'])
})
it('the Seeker upgrade can split the remaining cards between both ends in any order (May 2025 ruling)', () => {
  let s = inspect(start('05188', ['01091', '01088', '01089', '01090']), '05188')
  s = choose(s, 'choice.skip')
  s = choose(s, 'choice.skip')
  s = choose(s, 'choice.scrollBottom', { card: name('01089') })
  s = choose(s, 'choice.scrollTop', { card: name('01090') })
  s = choose(s, 'choice.scrollTop', { card: name('01088') })
  expect(me(s).deck).toEqual(['01090', '01088', '01091', '01089'])
  expect(me(s).discard).toEqual([])
  expect(me(s).hand).toEqual([])
})
it('discard and weakness revelation finish before the remaining inspected card returns', () => {
  let s = inspect(start('05188', ['01091', '01088', '01089', '01015']), '05188')
  s = choose(s, 'choice.scrollDiscard', { card: name('01088') })
  s = choose(s, 'choice.scrollHand', { card: name('01015') })
  expect(me(s).horror).toBe(2)
  expect(me(s).discard).not.toContain('01088')
  expect(me(s).deck).toEqual(['01091'])
  s = choose(s, 'choice.scrollBottom')
  expect(me(s).deck).toEqual(['01091', '01089'])
})
it('a remote investigator receives their own card; inspection state survives JSON serialization', () => {
  let s = patch({ deck: ['01089', '01088'], hand: [] }, 'b')(start('05116'))
  s = inspect(s, '05116', 'b')
  s = JSON.parse(JSON.stringify(s)) as GameState
  s = choose(s, 'choice.scrollHand')
  expect(s.investigators[1]!.hand).toEqual(['01088'])
  expect(s.investigators[1]!.deck).toEqual(['01089'])
  expect(me(s).hand).toEqual([])
})
it.each(['05116', '05188', '05189'])(
  '%s inspects encounter cards without offering the ownerless hand option',
  (code) => {
    let s: GameState = {
      ...start(code),
      encounterDeck: [
        { kind: 'treachery', code: 'scroll-test-1', name: 'First', keywords: [] },
        { kind: 'treachery', code: 'scroll-test-2', name: 'Second', keywords: [] },
        { kind: 'treachery', code: 'scroll-test-3', name: 'Third', keywords: [] },
      ],
    }
    s = inspect(s, code, '')
    expect(s.pending!.question.choices.some((c) => c.label === 'choice.scrollHand')).toBe(false)
    s = choose(s, 'choice.scrollDiscard', { card: code === '05188' ? 'Second' : 'Third' })
    if (code === '05188') {
      expect(s.pending!.question.choices.some((c) => c.label === 'choice.scrollHand')).toBe(false)
      s = choose(s, 'choice.skip')
      s = choose(s, 'choice.scrollTop', { card: 'Third' })
      s = choose(s, 'choice.scrollBottom', { card: 'First' })
      expect(s.encounterDeck.map((c) => c.name)).toEqual(['Third', 'First'])
    } else expect(s.encounterDeck.map((c) => c.name)).toEqual(['First', 'Second'])
    expect(s.encounterDiscard.at(-1)?.name).toBe(code === '05188' ? 'Second' : 'Third')
  },
)
it('a short deck supplies only its actual cards, keeps duplicate physical copies and never reshuffles', () => {
  let s = inspect(start('05188', ['01088', '01088']), '05188')
  expect(s.pending!.question.choices).toHaveLength(3)
  s = choose(s, 'choice.scrollDiscard')
  s = choose(s, 'choice.skip')
  s = choose(s, 'choice.scrollBottom')
  expect(me(s).deck).toEqual(['01088'])
  expect(me(s).discard).toEqual(['01088'])
  expect(me(s).horror).toBe(0)
})
