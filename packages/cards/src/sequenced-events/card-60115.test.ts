import { playableCards, playerCardBehavior } from '@lcg/engine'
import { choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, patch } from '../dunwich-pilot/testing'
import './index'
// RR: After Defeating an Enemy, Fast, Draw. The investigator who defeats it plays Glory.
it('pays and draws two cards after a real enemy defeat without spending an action', () => {
  let s = during(
    game(),
    patch({ hand: ['60115'], resources: 2 }),
    spawnAt('A', { ...ghoul, health: 1 }, 'a'),
  )
  const enemy = Object.keys(s.enemies)[0]!
  s = during(s, (s) => s, { type: 'DamageEnemy', enemy, amount: 1, by: 'a' })
  s = choose(s, 'ability.playCard', { card: 'Glory' })
  expect(s.investigators[0]!.resources).toBe(1)
  expect(s.investigators[0]!.hand).toHaveLength(2)
  expect(s.investigators[0]!.discard).toContain('60115')
  expect(s.investigators[0]!.actionsRemaining).toBe(3)
})
it('does not offer Glory for another investigator defeat or an ordinary fast window', () => {
  const s = during(game(), patch({ hand: ['60115'] }), spawnAt('A', ghoul, 'a'))
  const enemy = Object.values(s.enemies)[0]!
  expect(
    playerCardBehavior('60115')!.handReactions!(s, { type: 'enemyDefeated', enemy, by: 'b' }, 'a'),
  ).toEqual([])
  expect(playableCards(s, 'a', true)).not.toContain('60115')
})
