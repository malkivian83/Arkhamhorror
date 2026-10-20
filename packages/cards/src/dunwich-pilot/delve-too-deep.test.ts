import { expect, it } from 'vitest'
import { game, me, play } from './testing'
// RR: Skill Tests; Costs; Resolving Abilities; card-specific effect.
it('draws an encounter for each investigator before entering victory', () => {
  const s = play(game(['a', 'b']), '02111')
  expect(Object.values(s.enemies)).toHaveLength(2)
  expect(
    Object.values(s.enemies)
      .map((e) => e.engagedWith)
      .sort(),
  ).toEqual(['a', 'b'])
  expect(me(s).discard).not.toContain('02111')
  expect(JSON.stringify(s.victoryDisplay)).toContain('02111')
})
