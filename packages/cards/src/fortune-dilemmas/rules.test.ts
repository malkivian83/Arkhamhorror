// RR: Dilemma, Revelation, Doom, Direct Damage/Horror, Remove from Game.
import { expect, it } from 'vitest'
import { dispatch, playerCardBehavior, type GameState } from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'
import './index'
const drawn = (doom = 2) =>
  dispatch(
    patch({ hand: [], deck: ['09118'], discard: ['09118'], damage: 4, horror: 4 })(
      patch({ damage: 2, horror: 1 }, 'b')({ ...game(['a', 'b']), doom, pending: null, queue: [] }),
    ),
    { type: 'DrawCards', investigator: 'a', amount: 1 },
  )
it('places doom and heals three damage and horror from each investigator without removing the card', () => {
  const s = choose(drawn(), 'choice.fortuneHeal')
  expect(s.doom).toBe(3)
  expect(me(s)).toMatchObject({ damage: 1, horror: 1, discard: ['09118', '09118'] })
  expect(s.investigators[1]).toMatchObject({ damage: 0, horror: 0 })
  expect(playerCardBehavior('09118')!.canPlay!(s, 'a')).toBe(false)
})
it.each([0, 2])(
  'removes doom from %s, deals direct damage/horror, and removes only the resolving copy',
  (doom) => {
    let s = withAsset(drawn(doom), '01018')
    s = choose(s, 'choice.fortuneDoom')
    expect(s.doom).toBe(Math.max(0, doom - 1))
    expect(me(s)).toMatchObject({ damage: 5, horror: 5, discard: ['09118'] })
    expect(s.investigators[1]).toMatchObject({ damage: 3, horror: 2 })
    expect(s.assets['01018']).toMatchObject({ damage: 0, horror: 0 })
  },
)
it('the third Dilemma in a round is discarded without offering either effect', () => {
  let s: GameState = patch({ hand: [], deck: ['09118'], discard: [] })({
    ...game(['a', 'b']),
    pending: null,
    queue: [],
    dilemmasResolved: { round: 1, count: 2 },
  })
  s = dispatch(s, { type: 'DrawCards', investigator: 'a', amount: 1 })
  expect(s.pending).toBeNull()
  expect(me(s).discard).toEqual(['09118'])
  expect(s.dilemmasResolved!.count).toBe(2)
})
it('the resolving removal marker is serializable and cannot remove an unrelated discard copy', () => {
  const s = drawn()
  const restored = JSON.parse(JSON.stringify(s)) as GameState
  const next = choose(restored, 'choice.fortuneDoom')
  expect(me(next).discard).toEqual(['09118'])
  const untouched = dispatch(next, {
    type: 'RemoveResolvingRevelation',
    investigator: 'a',
    code: '09118',
  })
  expect(me(untouched).discard).toEqual(['09118'])
})
it('supports choosing either agenda when two agenda decks are in play', () => {
  const initial = drawn(2)
  let s: GameState = {
    ...initial,
    secondAgenda: {
      agendas: initial.agendas.map((a) => ({ ...a, name: 'Second agenda' })),
      index: initial.agendaIndex,
      doom: 4,
    },
  }
  s = choose(s, 'choice.fortuneDoom')
  s = choose(s, 'choice.doomOnAgenda', { name: 'Second agenda' })
  expect(s.doom).toBe(2)
  expect(s.secondAgenda!.doom).toBe(3)
  expect(me(s).discard).toEqual(['09118'])
})
