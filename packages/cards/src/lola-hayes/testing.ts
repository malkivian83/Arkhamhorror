import { createGame, type GameState } from '@lcg/engine'
import { choose, labels, testInvestigator, testScenario } from '@lcg/engine/testing'
import { starterInvestigator } from '../core-2026/player-cards'
import '../index'

export const LOLA = '03006'
/** Partida preparada: Lola elige `role` tras su mano inicial y las demás preguntas se aceptan. */
export function makeGame(
  others = false,
  chaosBag: GameState['chaosBag'] = [0],
  role = 'survivor',
): GameState {
  let s = createGame({
    seed: 4,
    scenario: testScenario({ chaosBag }),
    investigators: [starterInvestigator('lola'), ...(others ? [testInvestigator('b')] : [])],
  })
  for (let n = 0; n < 20 && s.pending; n++) {
    if (s.pending.question.prompt === 'prompt.lola.role') s = choose(s, `choice.lola.role.${role}`)
    else if (s.pending.question.prompt === 'prompt.chooseAction') break
    else s = choose(s, labels(s)[0]!)
  }
  return s
}
export const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
export const lola = (s: GameState) => s.investigators.find((i) => i.id === LOLA)!
/** Lola con un papel, una mano y unos recursos concretos. */
export const withLola = (
  s: GameState,
  changes: Partial<GameState['investigators'][number]>,
): GameState => ({
  ...s,
  investigators: s.investigators.map((i) => (i.id === LOLA ? { ...i, ...changes } : i)),
})
