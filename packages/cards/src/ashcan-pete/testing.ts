import { createGame, type GameState } from '@lcg/engine'
import { testInvestigator, testScenario } from '@lcg/engine/testing'
import { starterInvestigator } from '../core-2026/player-cards'
import '../index'

export const PETE = '02005'
export const makeGame = (others = false): GameState =>
  createGame({
    seed: 4,
    scenario: testScenario({ chaosBag: [0] }),
    investigators: [starterInvestigator('pete'), ...(others ? [testInvestigator('b')] : [])],
  })
export const duke = (s: GameState) => Object.values(s.assets).find((a) => a.code === '02014')!
export const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
