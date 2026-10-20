import { playableCards } from '@lcg/engine'
import { during, spawnAt, ghoul } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, hand, me, patch, play } from '../dunwich-pilot/testing'
// RR: Play Restrictions; Healing; Drawing Cards.
it('heals three horror and draws a card', () => {
  const s = play(during(game(), patch({ horror: 4 })), '02273')
  expect(me(s).horror).toBe(1)
  expect(me(s).hand).toHaveLength(1)
  expect(me(s).resources).toBe(7)
})
it('cannot play with an unengaged enemy here but ignores distant enemies', () => {
  let s = during(hand(game(), '02273'), (s) => s, spawnAt('B', ghoul, null))
  expect(playableCards(s, 'a', false)).toContain('02273')
  s = during(s, (s) => s, spawnAt('A', { ...ghoul, keywords: ['aloof'] }, null))
  expect(playableCards(s, 'a', false)).not.toContain('02273')
})
