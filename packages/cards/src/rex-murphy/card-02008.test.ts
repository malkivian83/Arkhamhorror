// RR: Draw, Effects: count current clues, with a maximum of five.
import { expect, it } from 'vitest'
import { dispatch, playerCardBehavior } from '@lcg/engine'
import { makeGame, clear } from './testing'
it.each([0, 2, 5, 8])('draws according to %i current clues', (clues) => {
  let s = clear(makeGame())
  const i = s.investigators[0]!
  s = { ...s, investigators: [{ ...i, clues, hand: [], deck: Array(10).fill('01088') }] }
  const messages = playerCardBehavior('02008')!.play!(s, i.id)
  for (const m of messages) s = dispatch(s, m)
  expect(s.investigators[0]!.hand).toHaveLength(Math.min(5, clues))
})
