import { playableCards } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, hand, me, patch, play } from '../dunwich-pilot/testing'
// RR: Target; Resolving Abilities. Choose exactly one other investigator here.
it('grants two cards and two resources to each of the chosen pair', () => {
  let s = play(game(['a', 'b', 'c']), '02148')
  const before = s.investigators.map((i) => ({ hand: i.hand.length, resources: i.resources }))
  s = choose(s, 'choice.investigator', { name: 'B' })
  expect(me(s).hand).toHaveLength(before[0]!.hand + 2)
  expect(me(s).resources).toBe(before[0]!.resources + 2)
  expect(s.investigators[1]!.hand).toHaveLength(before[1]!.hand + 2)
  expect(s.investigators[1]!.resources).toBe(before[1]!.resources + 2)
  expect(s.investigators[2]!.hand).toHaveLength(before[2]!.hand)
  expect(s.investigators[2]!.resources).toBe(before[2]!.resources)
})
it('requires another active investigator at the same location', () => {
  expect(playableCards(hand(game(), '02148'), 'a', false)).not.toContain('02148')
  const s = hand(during(game(['a', 'b']), patch({ location: 'B' }, 'b')), '02148')
  expect(playableCards(s, 'a', false)).not.toContain('02148')
})
