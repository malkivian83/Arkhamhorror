import { createGame, type GameState } from '@lcg/engine'
import { testScenario } from '@lcg/engine/testing'
import { starterInvestigator } from '../core-2026/player-cards'
import '../index'
export const makeGame = () =>
  createGame({
    seed: 4,
    scenario: testScenario({ chaosBag: [0] }),
    investigators: [starterInvestigator('rex')],
  })
export const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
