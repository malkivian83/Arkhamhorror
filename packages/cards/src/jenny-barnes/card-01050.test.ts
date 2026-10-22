// RR: Fast, Engagement, Movement ("if able").
import { playableCards } from '@lcg/engine'
import { choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, hand, me } from '../dunwich-pilot/testing'

const reveal = (s: ReturnType<typeof game>, ...ids: string[]) => ({
  ...s,
  locations: Object.fromEntries(
    Object.entries(s.locations).map(([id, l]) => [
      id,
      ids.includes(id) ? { ...l, revealed: true } : l,
    ]),
  ),
})

it('disengages from every enemy and moves to a revealed location without enemies', () => {
  let s = during(
    hand(game(), '01050'),
    (s) => reveal(s, 'B', 'C'),
    spawnAt('A', ghoul, 'a'),
    spawnAt('A', ghoul, 'a'),
    spawnAt('B', ghoul),
  )
  s = choose(s, 'action.playFast', { card: 'Elusive' })
  expect(s.pending!.question.choices.map((c) => c.params?.location)).toEqual(['Room C'])
  s = choose(s, 'choice.moveTo', { location: 'Room C' })
  expect(me(s).location).toBe('C')
  expect(Object.values(s.enemies).every((e) => e.engagedWith === null)).toBe(true)
  expect(me(s).actionsRemaining).toBe(3)
  expect(me(s).resources).toBe(8)
})

it('still disengages when no location qualifies, and only during its owner turn', () => {
  let s = during(hand(game(), '01050'), (s) => s, spawnAt('A', ghoul, 'a'), spawnAt('B', ghoul))
  s = choose(s, 'action.playFast', { card: 'Elusive' })
  expect(me(s).location).toBe('A')
  expect(Object.values(s.enemies).every((e) => e.engagedWith === null)).toBe(true)
  expect(playableCards({ ...s, activeTurn: 'other' }, 'a', true)).not.toContain('01050')
})
