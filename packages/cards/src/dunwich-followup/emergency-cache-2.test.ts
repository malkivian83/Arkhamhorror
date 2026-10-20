import { expect, it } from 'vitest'
import { game, me, play } from '../dunwich-pilot/testing'
// RR: Playing Cards; Resolving Abilities. This edition adds a card draw.
it('spends an action to gain three resources and draw one card', () => {
  const s = play(game(), '02194')
  expect(me(s).resources).toBe(13)
  expect(me(s).hand).toHaveLength(1)
  expect(me(s).discard).toContain('02194')
  expect(me(s).actionsRemaining).toBe(2)
})
