import { createGame } from '@lcg/engine'
import { describe, it } from 'vitest'
import { starterInvestigator } from '../core-2026/player-cards'
import '../index'
import { playRandomlyToEnd } from '../scenario-testing'
import { murderAtTheExcelsiorHotel } from './excelsior'

const KEYS = ['daniela', 'joe', 'trish', 'dexter', 'isabelle'] as const

/** Juega eligiendo opciones al azar (con semilla) y exige llegar al final. */
export function playRandomly(seed: number, players: number, interactive: boolean, limit = 3000) {
  const keys = KEYS.slice(0, players)
  const game = createGame({
    seed,
    difficulty: seed % 2 ? 'standard' : 'hard',
    interactive,
    scenario: murderAtTheExcelsiorHotel({
      seed,
      players,
      difficulty: seed % 2 ? 'standard' : 'hard',
    }),
    investigators: keys.map((k) => starterInvestigator(k)),
  })
  return playRandomlyToEnd(game, seed, limit)
}

describe('Asesinato en el hotel Excelsior: partidas al azar', () => {
  for (const players of [1, 2, 3, 4]) {
    it(`${players} investigador(es): 12 partidas con decisiones al azar llegan a una resolución`, () => {
      for (let seed = 1; seed <= 12; seed++) {
        playRandomly(seed * 7 + players, players, seed % 3 === 0)
      }
    })
  }
})
