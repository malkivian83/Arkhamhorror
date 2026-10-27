// RR: Fast, Agenda (doom threshold), Out of Play.
import { dispatch } from '@lcg/engine'
import { choose, labels } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { clear, makeGame, marie, MYSTIFYING_SONG, withMarie } from './testing'

const atThreshold = (hand: string[]) => ({
  ...withMarie(clear(makeGame()), { hand, resources: 5 }),
  doom: 3,
})

it('stops the agenda from advancing by its doom threshold until the end of the phase', () => {
  let s = dispatch(atThreshold([MYSTIFYING_SONG]), { type: 'CheckAgenda' })
  expect(labels(s)).toContain('ability.playCard')
  s = choose(s, 'ability.playCard')
  expect(s.agendaIndex).toBe(0)
  expect(marie(s).resources).toBe(2)
  // Retirada del juego: ni en la mano ni en la pila de descartes.
  expect([...marie(s).hand, ...marie(s).discard]).not.toContain(MYSTIFYING_SONG)
  s = dispatch(s, { type: 'CheckAgenda' })
  expect(s.agendaIndex).toBe(0)
  // En la fase siguiente el plan vuelve a avanzar.
  s = dispatch({ ...s, phase: 'enemy' }, { type: 'CheckAgenda' })
  expect(s.agendaIndex).toBe(1)
})

it('with two agenda decks, neither can advance by its doom threshold during the phase', () => {
  const dual = {
    ...atThreshold([MYSTIFYING_SONG]),
    doom: 0,
    secondAgenda: {
      agendas: [
        { name: 'Second 1', doomThreshold: 2 },
        { name: 'Second 2', doomThreshold: 5 },
      ],
      index: 0,
      doom: 2,
    },
  }
  let s = dispatch(dual, { type: 'CheckAgenda' })
  s = choose(s, 'ability.playCard')
  expect(s.secondAgenda?.index).toBe(0)
  s = dispatch({ ...s, doom: 3 }, { type: 'CheckAgenda' })
  expect([s.agendaIndex, s.secondAgenda?.index]).toEqual([0, 0])
})

it('can be declined, and without it the agenda advances normally', () => {
  let s = dispatch(atThreshold([MYSTIFYING_SONG]), { type: 'CheckAgenda' })
  s = choose(s, 'choice.skip')
  expect(s.agendaIndex).toBe(1)
  s = dispatch(atThreshold([]), { type: 'CheckAgenda' })
  expect(s.agendaIndex).toBe(1)
})
