import { createGame, dispatch, type GameState, type Message } from '@lcg/engine'
import { choose, labels, testInvestigator, testScenario } from '@lcg/engine/testing'
import { starterInvestigator } from '../core-2026/player-cards'
import '../index'
import { WENDY, WENDYS_AMULET } from './codes'

export * from './codes'

/** Partida preparada con Wendy (y otro investigador si `others`), en su menú de acciones. */
export function makeGame(others = false, chaosBag: GameState['chaosBag'] = [0]): GameState {
  let s = createGame({
    seed: 4,
    scenario: testScenario({ chaosBag }),
    investigators: [starterInvestigator('wendy'), ...(others ? [testInvestigator('b')] : [])],
  })
  for (let n = 0; n < 20 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++)
    s = choose(s, labels(s)[0]!)
  return s
}
export const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
export const wendy = (s: GameState) => s.investigators.find((i) => i.id === WENDY)!
export const withWendy = (
  s: GameState,
  changes: Partial<GameState['investigators'][number]>,
): GameState => ({
  ...s,
  investigators: s.investigators.map((i) => (i.id === WENDY ? { ...i, ...changes } : i)),
})
export const withAmulet = (s: GameState): GameState =>
  dispatch(s, { type: 'PutAssetIntoPlay', investigator: WENDY, code: WENDYS_AMULET })
/** Prueba de efecto de Wendy contra `difficulty`. */
export const effectTest = (difficulty: number) =>
  ({
    type: 'BeginSkillTest',
    investigator: WENDY,
    skill: 'willpower',
    difficulty,
    kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
  }) satisfies Message
