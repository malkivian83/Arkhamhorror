import { playerCardDef } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, me, withAsset } from './testing'
// RR: Skill Tests; Costs; Resolving Abilities; card-specific effect.
it('spends one charge and discovers two clues using willpower', () => {
  let s = during(game(), (s) => withAsset(s, '02028'))
  s = choose(s, 'ability.investigateWith', { card: playerCardDef('02028')!.name })
  expect(me(s).clues).toBe(2)
  expect(s.assets['02028']!.uses).toBe(2)
  expect(me(s).actionsRemaining).toBe(2)
})

// RR ST.8; Turn. End only after applying the clue results.
it('ends the turn after resolving a symbol, preserving the discovered clues', () => {
  let s = during(game(['a', 'b']), (s) => ({ ...withAsset(s, '02028'), chaosBag: ['skull'] }))
  s = choose(s, 'ability.investigateWith', { card: playerCardDef('02028')!.name })
  expect(me(s).clues).toBe(2)
  expect(me(s).actionsRemaining).toBe(0)
  expect(s.activeTurn).not.toBe('a')
})
