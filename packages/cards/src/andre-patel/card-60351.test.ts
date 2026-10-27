// RR: Triggered Abilities, Limits, Additional Actions, Elder Sign.
import { dispatch, playerCardDef } from '@lcg/engine'
import { choose, labels } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { ANDRE, andre, clear, effectTest, makeGame, withAndre } from './testing'

/** Su turno, sin cartas que comprometer. */
const ready = (bag: (number | 'elderSign')[] = [0]) =>
  withAndre(clear(makeGame(false, bag)), { hand: [] })

it('starts with his printed statistics and his four signatures', () => {
  const i = andre(makeGame())
  expect(i.skills).toEqual({ willpower: 2, intellect: 3, combat: 2, agility: 5 })
  expect([i.health, i.sanity]).toEqual([7, 8])
  expect(playerCardDef(ANDRE)!.signatures).toEqual(['60352', '60353', '60354', '60355'])
})

it('succeeding by 2 or more during his turn grants one additional action, once per round', () => {
  let s = ready()
  const actions = andre(s).actionsRemaining
  s = dispatch(s, effectTest(3))
  expect(labels(s)).toContain('ability.andre.action')
  s = choose(s, 'ability.andre.action')
  expect(s.pending).toBeNull()
  expect(andre(s).actionsRemaining).toBe(actions + 1)
  // Límite de una vez por ronda.
  s = dispatch(s, effectTest(3))
  expect(s.pending).toBeNull()
  expect(andre(s).actionsRemaining).toBe(actions + 1)
})

it('needs a margin of 2 and his own turn', () => {
  let s = dispatch(ready(), effectTest(4))
  expect(s.pending).toBeNull()
  s = dispatch({ ...ready(), activeTurn: null }, effectTest(3))
  expect(s.pending).toBeNull()
})

it('elder sign: +2 and gain 1 resource', () => {
  const s0 = ready(['elderSign'])
  const s = dispatch(s0, effectTest(7))
  expect(s.log.some((e) => e.key === 'log.testSuccess')).toBe(true)
  expect(andre(s).resources).toBe(andre(s0).resources + 1)
})
