// RR: Play, Discard Pile, Leaves Play, Forced Abilities.
import { dispatch, playableCards } from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { clear, makeGame, WENDY, wendy, withAmulet, withWendy } from './testing'

const EMERGENCY_CACHE = '01088'
const BASEBALL_BAT = '01074'

it('plays the topmost event of her discard pile, which then goes to the bottom of her deck', () => {
  let s = withAmulet(withWendy(clear(makeGame()), { hand: [], resources: 2 }))
  s = withWendy(s, { discard: ['01080', EMERGENCY_CACHE] })
  expect(playableCards(s, WENDY, false)).toContain(EMERGENCY_CACHE)
  s = dispatch(s, { type: 'PlayerWindow', investigator: WENDY })
  s = choose(s, 'action.play', { card: 'Emergency Cache' })
  expect(wendy(s).resources).toBe(2 + 3)
  expect(wendy(s).discard).toEqual(['01080'])
  expect(wendy(s).deck.at(-1)).toBe(EMERGENCY_CACHE)
})

it('only the topmost card counts, and only while the Amulet is in play', () => {
  const base = withWendy(clear(makeGame()), { hand: [], discard: [EMERGENCY_CACHE] })
  expect(playableCards(base, WENDY, false)).not.toContain(EMERGENCY_CACHE)
  const covered = withWendy(withAmulet(base), { discard: [EMERGENCY_CACHE, BASEBALL_BAT] })
  expect(playableCards(covered, WENDY, false)).not.toContain(EMERGENCY_CACHE)
})

it('events played from her hand also go to the bottom of her deck', () => {
  let s = withAmulet(withWendy(clear(makeGame()), { hand: [EMERGENCY_CACHE], discard: [] }))
  s = dispatch(s, { type: 'PlayerWindow', investigator: WENDY })
  s = choose(s, 'action.play', { card: 'Emergency Cache' })
  expect(wendy(s).discard).toEqual([])
  expect(wendy(s).deck.at(-1)).toBe(EMERGENCY_CACHE)
})
