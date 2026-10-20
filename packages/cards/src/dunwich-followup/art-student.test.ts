import { choose, during } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, me, play } from '../dunwich-pilot/testing'
// RR: Reactions; Entering Play; Discovering Clues.
it('optionally discovers a clue after being played', () => {
  let s = play(game(), '02149')
  s = choose(s, 'ability.followupClue')
  expect(me(s).clues).toBe(1)
  expect(s.locations.A!.clues).toBe(1)
  expect(s.assets[Object.keys(s.assets)[0]!]!.code).toBe('02149')
})
it('can decline the clue and triggers when entering through an effect', () => {
  let s = during(game(), (s) => s, { type: 'PutAssetIntoPlay', investigator: 'a', code: '02149' })
  s = choose(s, 'choice.skip')
  expect(me(s).clues).toBe(0)
})
it('does not offer a clue when the location has none', () => {
  const s = play(
    during(game(), (s) => ({
      ...s,
      locations: { ...s.locations, A: { ...s.locations.A!, clues: 0 } },
    })),
    '02149',
  )
  expect(s.pending!.question.prompt).toBe('prompt.chooseAction')
  expect(me(s).clues).toBe(0)
})
