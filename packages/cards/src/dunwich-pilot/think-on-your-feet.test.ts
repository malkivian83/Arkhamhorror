import { playerCardDef } from '@lcg/engine'
import { choose, during, spawnAt, ghoul } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, me, hand } from './testing'
// RR: Skill Tests; Costs; Resolving Abilities; card-specific effect.
it('moves before an enemy appears, leaving it in the original location', () => {
  let s = during(hand(game(), '02025'), (s) => s, spawnAt('A', ghoul, 'a'))
  s = choose(JSON.parse(JSON.stringify(s)), 'ability.playCard', {
    card: playerCardDef('02025')!.name,
  })
  expect(me(s).location).toBe('B')
  const e = Object.values(s.enemies)[0]!
  expect(e.location).toBe('A')
  expect(e.engagedWith).toBeNull()
})
