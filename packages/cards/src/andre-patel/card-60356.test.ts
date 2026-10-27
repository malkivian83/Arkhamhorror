// RR: Revelation, Threat Area, Forced Abilities, Limits, Weakness.
import { dispatch, type EncounterCard, type GameState } from '@lcg/engine'
import { ghoul } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { ANDRE, andre, clear, effectTest, makeGame, UNAWARE, withAndre } from './testing'

const surge: EncounterCard = { kind: 'treachery', code: 'test-x', name: 'X', keywords: [] }
const unaware = (s: GameState) => Object.values(s.treacheries).find((t) => t.code === UNAWARE)
/** André con Desprevenido en su zona de amenaza y el mazo de encuentros indicado. */
const ready = (encounterDeck: EncounterCard[], encounterDiscard: EncounterCard[] = []) => {
  let s = withAndre(clear(makeGame()), { hand: [], deck: [UNAWARE, '01088'] })
  s = dispatch(s, { type: 'DrawCards', investigator: ANDRE, amount: 1 })
  return { ...s, encounterDeck, encounterDiscard }
}

it('goes to his threat area; the first failed test of his turn draws an encounter card', () => {
  let s = ready([surge, { ...ghoul }])
  expect(unaware(s)?.placement).toEqual({ type: 'threatArea', investigator: ANDRE })
  s = dispatch(s, effectTest(9))
  expect(s.encounterDeck).toHaveLength(1)
  expect(unaware(s)).toBeDefined()
  // Solo la primera vez en cada turno.
  s = dispatch(s, effectTest(9))
  expect(s.encounterDeck).toHaveLength(1)
})

it('is discarded when the card drawn is an enemy, also after reshuffling the discard pile', () => {
  let s = dispatch(ready([{ ...ghoul }]), effectTest(9))
  expect(unaware(s)).toBeUndefined()
  expect(andre(s).discard).toContain(UNAWARE)
  s = dispatch(ready([], [{ ...ghoul }]), effectTest(9))
  expect(unaware(s)).toBeUndefined()
})

it('does nothing outside his turn or when he succeeds', () => {
  let s = dispatch({ ...ready([{ ...ghoul }]), activeTurn: null }, effectTest(9))
  expect(s.encounterDeck).toHaveLength(1)
  s = dispatch(ready([{ ...ghoul }]), effectTest(4))
  expect(s.encounterDeck).toHaveLength(1)
})
