import { playableCards } from '@lcg/engine'
import { during } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, hand, me, patch, play } from '../dunwich-pilot/testing'
// RR: Play Restrictions; Drawing Cards.
it('draws three cards when a clue remains at the location', () => {
  const s = play(game(), '02186')
  expect(me(s).hand).toHaveLength(3)
  expect(me(s).resources).toBe(8)
  expect(me(s).actionsRemaining).toBe(2)
  expect(s.locations.A!.clues).toBe(2)
})
it('does not substitute clues held by the investigator for a clue on the location', () => {
  const s = hand(
    during(game(), (s) => ({
      ...patch({ clues: 2 })(s),
      locations: { ...s.locations, A: { ...s.locations.A!, clues: 0 } },
    })),
    '02186',
  )
  expect(playableCards(s, 'a', false)).not.toContain('02186')
})
