import { during } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, me, play } from './testing'
// RR: Skill Tests; Costs; Resolving Abilities; card-specific effect.
it('takes the clue from the connecting location instead of here', () => {
  const s = play(
    during(game(), (s) => ({
      ...s,
      locations: { ...s.locations, B: { ...s.locations.B!, revealed: true, clues: 1 } },
    })),
    '02023',
  )
  expect(me(s).clues).toBe(1)
  expect(s.locations.A!.clues).toBe(2)
  expect(s.locations.B!.clues).toBe(0)
})
