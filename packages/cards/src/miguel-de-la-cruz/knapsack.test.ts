// RR: Triggered Abilities ("When you play"), "As if...", Attach To, Exhaust.
import { dispatch, playableCards, type GameState } from '@lcg/engine'
import { choose, labels } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { withAsset } from '../dunwich-pilot/testing'
import {
  DECOY_TRAP,
  GLASSING,
  KNAPSACK,
  MIGUEL,
  attach,
  attachmentsAt,
  makeGame,
  miguel,
  name,
  withMiguel,
} from './testing'

const setup = (hand: string[], change: (s: GameState) => GameState = (s) => s): GameState => {
  const s = withMiguel(change(withAsset(makeGame(), KNAPSACK, { owner: MIGUEL })), {
    hand,
    resources: 10,
  })
  return dispatch({ ...s, pending: null }, { type: 'PlayerWindow', investigator: MIGUEL })
}

it('resolves the played event as if Miguel were at a connecting location', () => {
  let s = choose(setup([DECOY_TRAP]), 'action.playFast', { card: name(DECOY_TRAP) })
  s = choose(s, 'ability.miguelsKnapsack', { card: name(DECOY_TRAP) })
  expect(s.assets[KNAPSACK]!.exhausted).toBe(true)
  s = choose(s, 'choice.knapsackPlayAt', { card: name(DECOY_TRAP), location: 'Room B' })
  expect(attachmentsAt(s, 'B').map((a) => a.code)).toEqual([DECOY_TRAP])
  expect(attachmentsAt(s, 'A')).toEqual([])
  // The "as if" state ends with the event: his mini-card never moved.
  expect(miguel(s).location).toBe('A')
})

it('may draw 1 card instead, and the event resolves normally', () => {
  let s = choose(setup([DECOY_TRAP]), 'action.playFast', { card: name(DECOY_TRAP) })
  const before = miguel(s).hand.length
  s = choose(s, 'ability.miguelsKnapsack', { card: name(DECOY_TRAP) })
  s = choose(s, 'choice.knapsackDraw')
  expect(miguel(s).hand.length).toBe(before + 1)
  expect(attachmentsAt(s, 'A').map((a) => a.code)).toEqual([DECOY_TRAP])
})

it('a ready Knapsack lets him play a second Trap where his location already has one', () => {
  let s = setup([GLASSING], (s) => attach(s, DECOY_TRAP, 'A', MIGUEL))
  expect(playableCards(s, MIGUEL, true)).toContain(GLASSING)
  s = choose(s, 'action.playFast', { card: name(GLASSING) })
  s = choose(s, 'ability.miguelsKnapsack', { card: name(GLASSING) })
  s = choose(s, 'choice.knapsackPlayAt', { card: name(GLASSING), location: 'Room B' })
  expect(attachmentsAt(s, 'B').map((a) => a.code)).toEqual([GLASSING])
  // Exhausted, it no longer allows it.
  const t = setup([GLASSING], (s) => attach(s, DECOY_TRAP, 'A', MIGUEL))
  const exhausted = {
    ...t,
    assets: { ...t.assets, [KNAPSACK]: { ...t.assets[KNAPSACK]!, exhausted: true } },
  }
  expect(playableCards(exhausted, MIGUEL, true)).not.toContain(GLASSING)
})

it('only reacts to events its owner plays', () => {
  const s = choose(setup(['60559']), 'action.play', { card: name('60559') })
  expect(labels(s)).not.toContain('ability.miguelsKnapsack')
})
