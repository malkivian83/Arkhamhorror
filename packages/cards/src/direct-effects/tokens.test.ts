import { playableCards, type GameState } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { patch, withAsset } from '../dunwich-pilot/testing'
import { holding, me, play } from './testing'

const own = (s: GameState, code: string, uses: number) =>
  during(s, (x) => withAsset(x, code, { uses }))

// RR: Uses, Fast, Reactions.
describe.each(['01026', '01526'])('%s Extra Ammunition', (code) => {
  it('places 3 ammo on a Firearm at your location', () => {
    const s = play(own(holding(code, { enemy: null }), '01029', 0), code)
    expect(s.assets['01029']!.uses).toBe(3)
    expect(playableCards(holding(code, { enemy: null }), 'a', false)).not.toContain(code)
  })
})

it('Swift Reload refills a Firearm you control to its uses value during your turn', () => {
  let s = own(holding('06161', { enemy: null }), '52001', 2)
  s = choose(s, 'action.playFast', { card: 'Swift Reload' })
  expect(s.assets['52001']!.uses).toBe(6)
  expect(me(s).actionsRemaining).toBe(3)
  const full = own(holding('06161', { enemy: null }), '52001', 6)
  expect(playableCards(full, 'a', true)).not.toContain('06161')
})

describe('Winds of Power', () => {
  it('places 2 charges on an asset you control that uses charges', () => {
    const s = play(own(holding('08063', { enemy: null }), '01060', 1), '08063')
    expect(s.assets['01060']!.uses).toBe(3)
  })
  it('may be played after you draw it during your turn', () => {
    let s = own(holding('08063', { enemy: null }), '01060', 1)
    s = during(s, patch({ hand: [], deck: ['08063'], resources: 5 }), {
      type: 'DrawCards',
      investigator: 'a',
      amount: 1,
    })
    s = choose(s, 'ability.playCard', { card: 'Winds of Power' })
    expect(s.assets['01060']!.uses).toBe(3)
    expect(me(s)).toMatchObject({ resources: 3, actionsRemaining: 3 })
  })
})

it('Truth from Fiction places 2 secrets only with a clue on your location', () => {
  const s = play(own(holding('04152', { enemy: null }), '09044', 1), '04152')
  expect(s.assets['09044']!.uses).toBe(3)
  const empty = during(own(holding('04152', { enemy: null }), '09044', 1), (x) => ({
    ...x,
    locations: { ...x.locations, A: { ...x.locations.A!, clues: 0 } },
  }))
  expect(playableCards(empty, 'a', false)).not.toContain('04152')
})
