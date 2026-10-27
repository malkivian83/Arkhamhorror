import { createGame, dispatch, type GameState, type Message, type SkillType } from '@lcg/engine'
import { choose, labels, testInvestigator, testScenario } from '@lcg/engine/testing'
import { starterInvestigator } from '../core-2026/player-cards'
import '../index'
import { CODEX_OF_AGES, MATEO } from './codes'

export * from './codes'

/** Partida preparada con Mateo (y otro investigador si `others`), en su menú de acciones. */
export function makeGame(others = false, chaosBag: GameState['chaosBag'] = [0]): GameState {
  let s = createGame({
    seed: 4,
    scenario: testScenario({ chaosBag }),
    investigators: [starterInvestigator('mateo'), ...(others ? [testInvestigator('b')] : [])],
  })
  for (let n = 0; n < 20 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++)
    s = choose(s, labels(s)[0]!)
  return s
}
export const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
export const mateo = (s: GameState) => s.investigators.find((i) => i.id === MATEO)!
export const withMateo = (
  s: GameState,
  changes: Partial<GameState['investigators'][number]>,
): GameState => ({
  ...s,
  investigators: s.investigators.map((i) => (i.id === MATEO ? { ...i, ...changes } : i)),
})
export const withCodex = (s: GameState): GameState =>
  dispatch(s, { type: 'PutAssetIntoPlay', investigator: MATEO, code: CODEX_OF_AGES })
/** Prueba de efecto de `who` contra `difficulty`. */
export const effectTest = (difficulty: number, who = MATEO, skill: SkillType = 'willpower') =>
  ({
    type: 'BeginSkillTest',
    investigator: who,
    skill,
    difficulty,
    kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
  }) satisfies Message
export const succeeded = (s: GameState) => s.log.findLast((e) => e.key.startsWith('log.test'))?.key
