import { dispatch, playableCards, skillTestValue, type GameState } from '@lcg/engine'
import { during } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { me } from '../dunwich-pilot/testing'
import { holding, play, resolve } from './testing'

const endTurn = (s: GameState) =>
  dispatch({ ...s, pending: null, queue: [] }, { type: 'EndTurn', investigator: 'a' })
const reveal = (s: GameState, ...ids: string[]) =>
  during(s, (x) => ({
    ...x,
    locations: Object.fromEntries(
      Object.entries(x.locations).map(([id, l]) => [
        id,
        ids.includes(id) ? { ...l, revealed: true, clues: 1 } : l,
      ]),
    ),
  }))

// RR: Investigate; investigation events provoke attacks of opportunity.
describe('Pilfer', () => {
  it('investigates with agility for 2 additional clues', () => {
    let s = play(holding('60315', { enemy: null }), '60315')
    expect(s.skillTest?.skill).toBe('agility')
    s = resolve(s)
    expect(me(s).clues).toBe(2)
  })
  it('level 3 returns to hand at the end of the turn by 2', () => {
    let s = resolve(play(holding('60328', { enemy: null }), '60328'), 1)
    expect(me(endTurn(s)).hand).toContain('60328')
    s = resolve(play(holding('60328', { enemy: null }), '60328'))
    expect(me(endTurn(s)).hand).not.toContain('60328')
  })
})

it('Burning the Midnight Oil gains 2 resources when the action begins and provokes', () => {
  const s = resolve(play(holding('60214'), '60214'), 'autoFail')
  expect(me(s)).toMatchObject({ resources: 10 + 2, clues: 0 })
  expect(me(s).damage + me(s).horror).toBeGreaterThan(0)
})

it('Deciphered Reality tests against the highest revealed shroud and takes a clue from each', () => {
  let s = reveal(holding('02303', { enemy: null }), 'B')
  s = play(s, '02303')
  expect(s.skillTest?.difficulty).toBe(3)
  s = resolve(s, 1)
  expect(me(s).clues).toBe(2)
  expect(s.locations.A!.clues).toBe(1)
  expect(s.locations.B!.clues).toBe(0)
})

describe('Unearth the Ancients', () => {
  it('needs a Seeker asset in hand and uses its printed cost as difficulty', () => {
    expect(playableCards(holding('04024', { enemy: null }), 'a', false)).not.toContain('04024')
    let s = play(holding('04024', { enemy: null, hand: ['04194', '60408'] }), '04024')
    // The only Seeker asset is chosen directly; its printed cost is 2.
    expect(s.skillTest?.difficulty).toBe(2)
    expect(skillTestValue(s).total).toBe(3)
    s = resolve(s)
    expect(Object.values(s.assets).map((a) => a.code)).toContain('04194')
    expect(me(s).hand).not.toContain('04194')
    expect(me(s).clues).toBe(0)
    // Otherworldly Compass is a Relic: draw 1 card.
    expect(me(s).hand).toHaveLength(2)
  })
  it('a failure keeps the asset in hand', () => {
    let s = play(holding('04024', { enemy: null, hand: ['04194'] }), '04024')
    s = resolve(s, -2)
    expect(me(s).hand).toContain('04194')
  })
})
