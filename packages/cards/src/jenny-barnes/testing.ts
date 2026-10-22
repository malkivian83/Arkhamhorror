import { createGame, type GameState } from '@lcg/engine'
import { testInvestigator, testScenario } from '@lcg/engine/testing'
import { starterInvestigator } from '../core-2026/player-cards'
import '../index'

export const JENNY = '02003'
export const makeGame = (others = false, chaosBag: GameState['chaosBag'] = [0]): GameState =>
  createGame({
    seed: 4,
    scenario: testScenario({ chaosBag }),
    investigators: [starterInvestigator('jenny'), ...(others ? [testInvestigator('b')] : [])],
  })
export const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
export const jenny = (s: GameState) => s.investigators.find((i) => i.id === JENNY)!
