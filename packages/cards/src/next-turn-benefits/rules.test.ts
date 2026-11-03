// RR: Additional Actions, Additional Costs, Lasting Effects.
import { expect, it } from 'vitest'
import { dispatch, playerCardBehavior, skillValueFor, type GameState } from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { game, patch, me } from '../dunwich-pilot/testing'
import './index'
const start = (code: string) =>
  patch({ hand: [code], resources: 5 })(
    patch({ hand: [], turnTaken: false }, 'b')({ ...game(['a', 'b']), pending: null, queue: [] }),
  )
const begin = (s: GameState, who: string) =>
  dispatch({ ...s, pending: null, queue: [] }, { type: 'BeginTurn', investigator: who })
it('Bide Your Time costs two actions and grants two additional actions on the next actual turn only', () => {
  let s = start('10129')
  s = choose(dispatch(s, { type: 'PlayerWindow', investigator: 'a' }), 'action.play', {
    card: 'Bide Your Time',
  })
  expect(me(s).actionsRemaining).toBe(1)
  s = begin(s, 'b')
  expect(s.investigators[1]!.actionsRemaining).toBe(3)
  s = begin({ ...s, round: s.round + 1 }, 'a')
  expect(me(s).actionsRemaining).toBe(5)
  expect(me(begin(s, 'a')).actionsRemaining).toBe(3)
})
it('Guidance grants four actions and boosts all skills only during the chosen investigator’s turn', () => {
  let s = start('09053')
  s = dispatch(s, { type: 'PlayCard', investigator: 'a', code: '09053' })
  const value = (s: GameState) =>
    skillValueFor(s, 'b', 'intellect', { type: 'investigate', location: 'A' })
  const base = s.investigators[1]!.skills.intellect
  expect(value(s)).toBe(base)
  s = begin(s, 'b')
  expect(s.investigators[1]!.actionsRemaining).toBe(4)
  expect(value(s)).toBe(base + 1)
  expect(value(begin(s, 'a'))).toBe(base)
  expect(value(begin(s, 'b'))).toBe(base)
})
it('Guidance excludes distant, eliminated and already-active investigators and expires after its round', () => {
  const initial = start('09053'),
    b = playerCardBehavior('09053')!
  for (const s of [
    patch({ location: 'C' }, 'b')(initial),
    patch({ turnTaken: true }, 'b')(initial),
    patch({ eliminated: true }, 'b')(initial),
  ])
    expect(b.canPlay!(s, 'a')).toBe(false)
  const s = dispatch(initial, ...b.play!(initial, 'a'))
  const next = begin({ ...s, round: s.round + 1 }, 'b')
  expect(next.investigators[1]!.actionsRemaining).toBe(3)
})
it('stacked delayed benefits survive JSON serialization and delayed action losses consume the bonus', () => {
  let s = start('10129')
  s = dispatch(
    s,
    ...playerCardBehavior('10129')!.play!(s, 'a'),
    ...playerCardBehavior('10129')!.play!(s, 'a'),
  )
  s = begin(patch({ nextTurnActionLoss: 4 })(JSON.parse(JSON.stringify(s)) as GameState), 'a')
  expect(me(s).actionsRemaining).toBe(3)
})
