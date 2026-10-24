import { createGame } from '@lcg/engine'
import { describe, it } from 'vitest'
import { starterInvestigator } from '../core-2026/player-cards'
import '../index'
import { playRandomlyToEnd } from '../scenario-testing'
import { curtainCall } from './curtain-call'

const KEYS = ['daniela', 'joe', 'trish', 'dexter', 'isabelle'] as const
const DIFFICULTIES = ['easy', 'standard', 'hard', 'expert'] as const

/** Decisiones al azar (con semilla) hasta una resolución, en las cuatro dificultades. */
function playRandomly(seed: number, players: number, interactive: boolean) {
  const difficulty = DIFFICULTIES[seed % 4]!
  const game = createGame({
    seed,
    difficulty,
    interactive,
    scenario: curtainCall({ difficulty }),
    investigators: KEYS.slice(0, players).map((k) => starterInvestigator(k)),
  })
  return playRandomlyToEnd(game, seed, 4000)
}

describe('Se cierra el telón: partidas al azar', () => {
  for (const players of [1, 2, 3, 4]) {
    it(`${players} investigador(es): 12 partidas con decisiones al azar llegan a una resolución`, () => {
      for (let seed = 1; seed <= 12; seed++)
        playRandomly(seed * 7 + players, players, seed % 3 !== 0)
    })
  }
})
