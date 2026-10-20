import { playerCardDef } from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, me, hand } from './testing'
// RR: Skill Tests; Costs; Resolving Abilities; card-specific effect.
it('moves another investigator without spending their action', () => {
  let s = hand(game(['a', 'b']), '02022')
  s = choose(s, 'action.playFast', { card: playerCardDef('02022')!.name })
  s = choose(s, 'choice.pilotMove', { name: 'B' })
  expect(s.investigators[1]!.location).toBe('B')
  expect(me(s).location).toBe('A')
  expect(me(s).actionsRemaining).toBe(3)
})
