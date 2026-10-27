import { createGame, type GameState, type Message } from '@lcg/engine'
import { choose, labels, testInvestigator, testScenario } from '@lcg/engine/testing'
import { starterInvestigator } from '../core-2026/player-cards'
import '../index'
import { ANDRE } from './codes'

export * from './codes'

/** Partida preparada con André (y otro investigador si `others`), en su menú de acciones. */
export function makeGame(others = false, chaosBag: GameState['chaosBag'] = [0]): GameState {
  let s = createGame({
    seed: 4,
    scenario: testScenario({ chaosBag }),
    investigators: [starterInvestigator('andre'), ...(others ? [testInvestigator('b')] : [])],
  })
  for (let n = 0; n < 20 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++)
    s = choose(s, labels(s)[0]!)
  return s
}
export const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
export const andre = (s: GameState) => s.investigators.find((i) => i.id === ANDRE)!
export const withAndre = (
  s: GameState,
  changes: Partial<GameState['investigators'][number]>,
): GameState => ({
  ...s,
  investigators: s.investigators.map((i) => (i.id === ANDRE ? { ...i, ...changes } : i)),
})
/** Prueba de efecto (de una carta de escenario) de André contra `difficulty`. */
export const effectTest = (difficulty: number, skill: 'agility' | 'willpower' = 'agility') =>
  ({
    type: 'BeginSkillTest',
    investigator: ANDRE,
    skill,
    difficulty,
    kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
  }) satisfies Message
