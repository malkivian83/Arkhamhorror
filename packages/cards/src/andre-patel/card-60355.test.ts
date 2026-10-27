// RR: Revelation, Threat Area, Forced Abilities, Weakness.
import { dispatch } from '@lcg/engine'
import { expect, it } from 'vitest'
import {
  andre,
  ANDRE,
  clear,
  effectTest,
  makeGame,
  WEIGHT_OF_THE_WORLD,
  withAndre,
} from './testing'

const weight = (s: ReturnType<typeof makeGame>) =>
  Object.values(s.treacheries).find((t) => t.code === WEIGHT_OF_THE_WORLD)

it('goes to his threat area; each failed test deals 1 horror and shuffles it back', () => {
  let s = withAndre(clear(makeGame()), { hand: [], deck: [WEIGHT_OF_THE_WORLD, '01088'] })
  s = dispatch(s, { type: 'DrawCards', investigator: ANDRE, amount: 1 })
  expect(weight(s)?.placement).toEqual({ type: 'threatArea', investigator: ANDRE })
  // Una prueba superada (por 1, sin la reacción de André) no la activa.
  s = dispatch(clear(s), effectTest(4))
  expect(s.pending).toBeNull()
  expect(weight(s)).toBeDefined()
  const horror = andre(s).horror
  s = dispatch(clear(s), effectTest(9))
  expect(andre(s).horror).toBe(horror + 1)
  expect(weight(s)).toBeUndefined()
  expect(andre(s).deck).toContain(WEIGHT_OF_THE_WORLD)
})
