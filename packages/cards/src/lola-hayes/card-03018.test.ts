// RR: Fast, Play only during your turn, Cost reduction.
import { cardCost, dispatch, playerCardDef, playableCards, type GameState } from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { clear, lola, LOLA, makeGame, withLola } from './testing'

const myTurn = (s: GameState): GameState => ({ ...s, activeTurn: LOLA })

it('is a fast event playable only during her own turn', () => {
  expect(playerCardDef('03018')).toMatchObject({ fast: true, cost: 0, class: 'neutral' })
  const s = withLola(clear(makeGame()), { role: 'guardian', hand: ['03018'] })
  expect(playableCards({ ...s, activeTurn: 'b' }, LOLA, true)).not.toContain('03018')
  expect(playableCards(myTurn(s), LOLA, true)).toContain('03018')
})

it('switches role, discounts her next card of that role by 3 this turn and draws 1', () => {
  let s = myTurn(
    withLola(clear(makeGame()), { role: 'guardian', hand: ['03018', '12031', '12032'] }),
  )
  const hand = lola(s).hand.length
  s = dispatch(s, { type: 'PlayCard', investigator: LOLA, code: '03018' })
  s = choose(s, 'choice.lola.role.seeker')
  expect(lola(s).role).toBe('seeker')
  expect(lola(s).hand.length).toBe(hand) // juega 1 y roba 1
  // Fingerprint Kit (4) cuesta 1; solo la siguiente carta del papel.
  expect(cardCost(s, LOLA, '12031')).toBe(1)
  s = dispatch(clear(s), { type: 'PlayCard', investigator: LOLA, code: '12031' })
  expect(cardCost(s, LOLA, '12032')).toBe(2)
})

it('the discount ends with her turn', () => {
  let s = myTurn(withLola(clear(makeGame()), { role: 'guardian', hand: ['03018', '12031'] }))
  s = choose(
    dispatch(s, { type: 'PlayCard', investigator: LOLA, code: '03018' }),
    'choice.lola.role.seeker',
  )
  expect(cardCost({ ...s, activeTurn: null }, LOLA, '12031')).toBe(4)
  expect(cardCost({ ...s, round: s.round + 1 }, LOLA, '12031')).toBe(4)
})
