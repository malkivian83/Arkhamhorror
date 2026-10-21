import { applyInput, createGame } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { starterInvestigator } from '../core-2026/player-cards'
import '../index'
import { murderAtTheExcelsiorHotel } from './excelsior'

const KEYS = ['daniela', 'joe', 'trish', 'dexter', 'isabelle'] as const

/** Juega eligiendo opciones al azar (con semilla) hasta el final o `limit` decisiones. */
export function playRandomly(seed: number, players: number, interactive: boolean, limit = 800) {
  const keys = KEYS.slice(0, players)
  let game = createGame({
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
  let r = seed
  const random = (n: number) => {
    r = (r * 1103515245 + 12345) % 2 ** 31
    return r % n
  }
  for (let n = 0; n < limit && !game.outcome && game.pending; n++) {
    const choice = random(game.pending.question.choices.length)
    game = applyInput(game, { investigator: game.pending.investigator, choice })
  }
  return game
}

describe('Asesinato en el hotel Excelsior: partidas al azar', () => {
  for (const players of [1, 2, 3, 4]) {
    it(`${players} investigador(es): 12 partidas con decisiones al azar no rompen el motor`, () => {
      for (let seed = 1; seed <= 12; seed++) {
        const game = playRandomly(seed * 7 + players, players, seed % 3 === 0)
        expect(game.outcome !== null || game.pending !== null).toBe(true)
      }
    })
  }
})
