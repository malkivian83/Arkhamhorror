// RR: Revelation, Direct Damage/Horror, Out of Play, Weakness.
import { dispatch } from '@lcg/engine'
import { expect, it } from 'vitest'
import { ABANDONED_AND_ALONE, clear, makeGame, WENDY, wendy, withWendy } from './testing'

it('deals 2 direct horror and removes her discard pile from the game', () => {
  let s = withWendy(clear(makeGame()), {
    hand: [],
    deck: [ABANDONED_AND_ALONE, '01088'],
    discard: ['01080', '01081', '01074'],
  })
  const horror = wendy(s).horror
  s = dispatch(s, { type: 'DrawCards', investigator: WENDY, amount: 1 })
  expect(wendy(s).horror).toBe(horror + 2)
  // Solo queda la propia debilidad, descartada tras resolverse.
  expect(wendy(s).discard).toEqual([ABANDONED_AND_ALONE])
  expect(s.log.some((e) => e.key === 'log.discardRemoved')).toBe(true)
})
