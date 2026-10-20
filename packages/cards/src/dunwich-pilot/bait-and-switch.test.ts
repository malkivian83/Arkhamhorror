import { during, spawnAt, ghoul } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, me, play } from './testing'
// RR: Skill Tests; Costs; Resolving Abilities; card-specific effect.
it('evades and moves a non-Elite enemy without an opportunity attack', () => {
  let s = during(game(), (s) => s, spawnAt('A', ghoul, 'a'))
  s = play(s, '02034')
  const e = Object.values(s.enemies)[0]!
  expect(e.location).toBe('B')
  expect(e.exhausted).toBe(true)
  expect(e.engagedWith).toBeNull()
  expect(me(s).damage).toBe(0)
})

// RR: Elite restrictions apply to movement, not the evasion.
it('evades an Elite target without moving it', () => {
  let s = during(game(), (s) => s, spawnAt('A', { ...ghoul, traits: ['Elite'] }, 'a'))
  s = play(s, '02034')
  const e = Object.values(s.enemies)[0]!
  expect(e.location).toBe('A')
  expect(e.exhausted).toBe(true)
  expect(e.engagedWith).toBeNull()
})
