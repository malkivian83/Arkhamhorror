import { applyInput, nextInt, seedRng, type GameState } from '@lcg/engine'
import { expect } from 'vitest'

/** Decisiones legales y reproducibles; agotar el presupuesto no cuenta como terminar. */
export function playRandomlyToEnd(initial: GameState, seed: number, limit = 3000): GameState {
  let game = initial
  let rng = seedRng(seed)
  for (let n = 0; n < limit && !game.outcome; n++) {
    const context = `${game.scenarioId}, seed ${seed}, decision ${n}`
    expect(game.pending, context).not.toBeNull()
    const pending = game.pending!
    expect(pending.question.choices.length, context).toBeGreaterThan(0)
    let choice: number
    ;[choice, rng] = nextInt(rng, pending.question.choices.length)
    game = applyInput(game, { investigator: pending.investigator, choice })
  }
  expect(
    game.outcome,
    `${game.scenarioId}, seed ${seed}: no resolution after ${limit} decisions (${game.pending?.question.prompt})`,
  ).not.toBeNull()
  return game
}
