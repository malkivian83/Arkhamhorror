import { createGame, type GameState, type Message } from '@lcg/engine'
import { choose, labels, testInvestigator, testScenario } from '@lcg/engine/testing'
import { starterInvestigator } from '../core-2026/player-cards'
import '../index'
import { STELLA } from './codes'

export * from './codes'

/** Partida preparada con Stella (y otro investigador si `others`), en su menú de acciones. */
export function makeGame(others = false, chaosBag: GameState['chaosBag'] = [0]): GameState {
  let s = createGame({
    seed: 4,
    scenario: testScenario({ chaosBag }),
    investigators: [starterInvestigator('stella'), ...(others ? [testInvestigator('b')] : [])],
  })
  for (let n = 0; n < 20 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++)
    s = choose(s, labels(s)[0]!)
  return s
}
export const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
export const stella = (s: GameState) => s.investigators.find((i) => i.id === STELLA)!
export const withStella = (
  s: GameState,
  changes: Partial<GameState['investigators'][number]>,
): GameState => ({
  ...s,
  investigators: s.investigators.map((i) => (i.id === STELLA ? { ...i, ...changes } : i)),
})
/** Prueba de efecto de Stella contra `difficulty`. */
export const effectTest = (
  difficulty: number,
  onFail: Message[] = [],
  skill: 'agility' | 'willpower' | 'intellect' = 'agility',
) =>
  ({
    type: 'BeginSkillTest',
    investigator: STELLA,
    skill,
    difficulty,
    kind: { type: 'effect', source: 'test', onSuccess: [], onFail, onFailEach: [] },
  }) satisfies Message
export const put = (code: string, investigator = STELLA) =>
  ({ type: 'PutAssetIntoPlay', investigator, code }) satisfies Message
/** Último resultado de prueba registrado. */
export const result = (s: GameState) => s.log.findLast((e) => e.key.startsWith('log.test'))?.key
/** Responde las preguntas pendientes con `label` (o la última opción) hasta el menú. */
export function through(s: GameState, label = 'choice.skip'): GameState {
  for (let n = 0; n < 40 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++)
    s = choose(s, labels(s).includes(label) ? label : labels(s).at(-1)!)
  return s
}
