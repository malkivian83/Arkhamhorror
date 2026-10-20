import { during, spawnAt, ghoul } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, me, patch, play } from './testing'
// RR: Skill Tests; Costs; Resolving Abilities; card-specific effect.
it('attacks with intellect and adds damage up to three clues', () => {
  let s = during(game(), patch({ clues: 3 }), spawnAt('A', { ...ghoul, health: 8 }, 'a'))
  s = play(s, '02107')
  expect(Object.values(s.enemies)[0]!.damageTaken).toBe(4)
  expect(me(s).damage).toBe(0)
})
