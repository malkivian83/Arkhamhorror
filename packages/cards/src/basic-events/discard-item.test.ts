import { playableCards, skillTestValue } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { me } from '../dunwich-pilot/testing'
import { enemy, holding, play, resolve, sturdy } from './testing'

// RR: Additional costs. The Item must take up a hand slot; X is its printed cost (Machete 3).
describe.each([
  ['05037', 'Act of Desperation'],
  ['11086', '"Catch!"'],
  ['11087', 'Unconventional Method'],
] as const)('%s %s', (code, _name) => {
  it('requires a hand-slot Item in hand or in play', () => {
    expect(playableCards(holding(code), 'a', false)).not.toContain(code)
    expect(playableCards(holding(code, { hand: ['12020'] }), 'a', false)).toContain(code)
    expect(playableCards(holding(code, { assets: ['12020'] }), 'a', false)).toContain(code)
  })
  it('discards the Item from hand for +X, with no bonus effect', () => {
    // The only eligible Item is chosen directly.
    let s = play(holding(code, { hand: ['12020'] }), code)
    expect(me(s).discard).toContain('12020')
    expect(skillTestValue(s).total).toBe(3 + 3)
    s = resolve(s)
    expect(me(s).resources).toBe(10)
    if (code === '11086') expect(enemy(s).stayExhausted).toBeUndefined()
    if (code === '11087') expect(me(s).clues).toBe(1)
  })
  it('discards the Item from play for +X and its bonus effect', () => {
    let s = play(holding(code, { assets: ['12020'] }), code)
    expect(s.assets['12020']).toBeUndefined()
    s = resolve(s)
    if (code === '05037') {
      expect(me(s).resources).toBe(13)
      expect(enemy(s).damageTaken).toBe(2)
    }
    if (code === '11086') expect(enemy(s).stayExhausted).toBe(true)
    if (code === '11087') expect(me(s).clues).toBe(2)
  })
})

it('"Catch!" does not keep an Elite enemy exhausted', () => {
  let s = play(
    holding('11086', { assets: ['12020'], enemy: { ...sturdy, traits: ['Elite'] } }),
    '11086',
  )
  s = resolve(s)
  expect(enemy(s).stayExhausted).toBeUndefined()
})

it('offers each eligible Item when there are several', () => {
  const s = play(holding('05037', { hand: ['12020'], assets: ['01016'] }), '05037')
  const labels = s.pending!.question.choices.map((c) => [c.label, c.params?.card])
  expect(labels).toEqual(
    expect.arrayContaining([
      ['choice.discardFromHand', 'Machete'],
      ['choice.discardFromPlay', '.45 Automatic'],
    ]),
  )
})
