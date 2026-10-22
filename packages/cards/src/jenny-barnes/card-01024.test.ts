// RR: Damage, Simultaneous effects, Enemy defeat.
import { choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, hand, me } from '../dunwich-pilot/testing'

const enemies = (s: ReturnType<typeof game>) => Object.values(s.enemies)
const partnerAtB = (s: ReturnType<typeof game>) => ({
  ...s,
  investigators: s.investigators.map((i) => (i.id === 'b' ? { ...i, location: 'B' } : i)),
})
const other = (s: ReturnType<typeof game>) => s.investigators.find((i) => i.id === 'b')!

it('deals 3 damage to each enemy and investigator at the chosen connecting location', () => {
  let s = during(
    hand(game(['a', 'b']), '01024'),
    partnerAtB,
    spawnAt('B', { ...ghoul, health: 5 }),
    spawnAt('C', { ...ghoul, health: 5 }),
  )
  s = choose(s, 'action.play', { card: 'Dynamite Blast' })
  expect(s.pending!.question.choices.map((c) => c.params?.location)).toEqual(['Room A', 'Room B'])
  s = choose(s, 'choice.dynamiteLocation', { location: 'Room B' })
  const [atB, atC] = enemies(s)
  expect(atB!.damageTaken).toBe(3)
  expect(atC!.damageTaken).toBe(0)
  expect(other(s).damage).toBe(3)
  expect(me(s).damage).toBe(0)
  expect(me(s).resources).toBe(5)
})

it('places all damage before any enemy at the location is defeated', () => {
  let s = during(
    hand(game(['a', 'b']), '01024'),
    partnerAtB,
    spawnAt('B', ghoul, 'b'),
    spawnAt('B', { ...ghoul, health: 3 }),
  )
  s = choose(s, 'action.play', { card: 'Dynamite Blast' })
  s = choose(s, 'choice.dynamiteLocation', { location: 'Room B' })
  expect(enemies(s)).toHaveLength(0)
  expect(other(s).damage).toBe(3)
  const order = s.log.map((e) => e.key)
  expect(order.lastIndexOf('log.damage')).toBeLessThan(order.indexOf('log.enemyDefeated'))
})
