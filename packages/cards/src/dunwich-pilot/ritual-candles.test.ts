import { choose, during } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, me, withAsset } from './testing'
// RR: Skill Tests; Costs; Resolving Abilities; card-specific effect.
it('offers a bonus on an investigator’s symbol reveal even with another source', () => {
  let s = during(game(), (s) => ({ ...withAsset(s, '02029'), chaosBag: ['skull'] }))
  s = choose(s, 'action.investigate')
  s = choose(s, 'ability.pilotCandle')
  expect(me(s).clues).toBe(1)
})
