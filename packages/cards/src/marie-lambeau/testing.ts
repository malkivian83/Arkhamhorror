import { createGame, type GameState, type Message } from '@lcg/engine'
import { choose, labels, testInvestigator, testScenario } from '@lcg/engine/testing'
import { starterInvestigator } from '../core-2026/player-cards'
import '../index'
import { MARIE } from './codes'

export * from './codes'

/** Partida preparada con Marie (y otro investigador si `others`), en su menú de acciones. */
export function makeGame(others = false, chaosBag: GameState['chaosBag'] = [0]): GameState {
  let s = createGame({
    seed: 4,
    scenario: testScenario({ chaosBag }),
    investigators: [starterInvestigator('marie'), ...(others ? [testInvestigator('b')] : [])],
  })
  for (let n = 0; n < 20 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++)
    s = choose(s, labels(s)[0]!)
  return s
}
export const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
export const marie = (s: GameState) => s.investigators.find((i) => i.id === MARIE)!
export const withMarie = (
  s: GameState,
  changes: Partial<GameState['investigators'][number]>,
): GameState => ({
  ...s,
  investigators: s.investigators.map((i) => (i.id === MARIE ? { ...i, ...changes } : i)),
})
/** Prueba de efecto de Marie contra `difficulty`. */
export const effectTest = (difficulty: number) =>
  ({
    type: 'BeginSkillTest',
    investigator: MARIE,
    skill: 'willpower',
    difficulty,
    kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
  }) satisfies Message
