// RR: Additional Costs, Move, Massive, Elite, Attacks of Opportunity.
import { expect, it } from 'vitest'
import { dispatch, playerCardBehavior, type GameState, type Enemy } from '@lcg/engine'
import { choose, ghoul } from '@lcg/engine/testing'
import { game, patch, me, withAsset } from '../dunwich-pilot/testing'
import './index'
const start = (weapon = '01016', uses = 2) => {
  let s = withAsset(
    patch({ hand: ['05229'], resources: 5 })({ ...game(['a', 'b']), pending: null, queue: [] }),
    weapon,
    { uses },
  )
  const make = (id: string, changes: Partial<Enemy> = {}): Enemy => ({
    ...ghoul,
    id,
    name: id,
    location: 'A',
    engagedWith: 'a',
    exhausted: false,
    maxHealth: 3,
    damageTaken: 0,
    doom: 0,
    ...changes,
  })
  s = {
    ...s,
    enemies: {
      one: make('one'),
      two: make('two', { engagedWith: 'b', exhausted: true }),
      elite: make('elite', { traits: ['Elite'] }),
      far: make('far', { location: 'C', engagedWith: null }),
      huge: make('huge', { engagedWith: null, keywords: ['massive'] }),
    },
  }
  return s
}
const play = (s: GameState) =>
  choose(dispatch(s, { type: 'PlayerWindow', investigator: 'a' }), 'action.play', {
    card: 'Warning Shot',
  })
it('spends one ammo and two resources, moves every local non-Elite to one destination without opportunity attacks', () => {
  let s = play(start())
  expect(s.assets['01016']!.uses).toBe(1)
  if (s.pending?.question.choices.some((c) => c.label === 'choice.location'))
    s = choose(s, 'choice.location', { location: 'Room B' })
  expect(me(s)).toMatchObject({ resources: 3, actionsRemaining: 2, damage: 0, horror: 0 })
  for (const id of ['one', 'two', 'huge'])
    expect(s.enemies[id]).toMatchObject({ location: 'B', engagedWith: null })
  expect(s.enemies.two!.exhausted).toBe(true)
  expect(s.enemies.elite!.location).toBe('A')
  expect(s.enemies.far!.location).toBe('C')
})
it('requires your own loaded Firearm and an existing connecting destination', () => {
  const can = (s: GameState) => playerCardBehavior('05229')!.canPlay!(s, 'a')
  expect(can(start('01016', 0))).toBe(false)
  expect(can(start('01060'))).toBe(false)
  const s = start()
  expect(can({ ...s, assets: { '01016': { ...s.assets['01016']!, owner: 'b' } } })).toBe(false)
  expect(can({ ...s, enemies: { elite: s.enemies.elite! } })).toBe(false)
  expect(
    can({ ...s, locations: { ...s.locations, A: { ...s.locations.A!, connections: [] } } }),
  ).toBe(false)
})
it('lets the player choose which loaded Firearm pays, preserving the other one', () => {
  let s = play(withAsset(start(), '03020', { uses: 3 }))
  s = choose(s, 'choice.assignToAsset', { card: '.32 Colt' })
  expect(s.assets['01016']!.uses).toBe(2)
  expect(s.assets['03020']!.uses).toBe(2)
  expect(JSON.parse(JSON.stringify(s)).pending).toEqual(s.pending)
})
it('ammo spent from the Guardian Thompson becomes a resource even outside its Fight ability', () => {
  const s = play(start('05186', 1))
  expect(me(s).resources).toBe(4)
  expect(s.assets['05186']!.uses).toBe(0)
})
