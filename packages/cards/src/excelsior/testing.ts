/** Utilidades de las pruebas de Asesinato en el hotel Excelsior. */
import { createGame, getInvestigator, type GameState, type Message } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { starterInvestigator } from '../core-2026/player-cards'
import '../index'
import { murderAtTheExcelsiorHotel } from './excelsior'

export const KEYS = ['daniela', 'joe', 'trish', 'dexter'] as const
export const ids = KEYS.map((k) => starterInvestigator(k).id)

export function newGame(players = 2, seed = 5, interactive = false): GameState {
  return createGame({
    seed,
    interactive,
    scenario: murderAtTheExcelsiorHotel({ seed, players }),
    investigators: KEYS.slice(0, players).map((k) => starterInvestigator(k)),
  })
}

/** Abre el menú de acciones del primer investigador. */
export function actions(game: GameState): GameState {
  let g = game
  while (g.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    g = choose(g, 'choice.investigator', { name: getInvestigator(g, ids[0]!).name })
  return g
}

/**
 * Contesta las preguntas rutinarias: no comprometer cartas, pasar en las reacciones,
 * aplicar resultados y elegir el primero cuando hay que elegir Agente o investigador.
 */
export function settle(game: GameState): GameState {
  let g = game
  for (let n = 0; n < 50 && g.pending; n++) {
    const prompt = g.pending.question.prompt
    if (prompt === 'prompt.commitCards') g = choose(g, 'choice.revealToken')
    else if (prompt === 'prompt.reaction') g = choose(g, 'choice.skip')
    else if (prompt === 'prompt.skillTestSucceeded' || prompt === 'prompt.skillTestFailed')
      g = choose(g, 'choice.applyResults')
    else if (prompt === 'prompt.excelsior.officerDoom') g = choose(g, 'choice.enemy')
    else if (prompt === 'prompt.excelsior.takeMonroe') g = choose(g, 'choice.investigator')
    else break
  }
  return g
}

/**
 * Lleva la partida al acto 2 con estos Indicios en juego (con `clues` pistas cada
 * uno) y los Lugares apartados ya en juego.
 */
export function atFollowingLeads(
  game: GameState,
  leads: [string, string],
  clues = 4,
  modify: (s: GameState) => GameState = (s) => s,
): GameState {
  let g = actions(game)
  g = during(
    g,
    (s) =>
      modify({ ...s, actIndex: 1, scenarioMeta: { ...s.scenarioMeta, leads: leads.join(',') } }),
    ...(['84015', '84016', '84017', '84018', '84019'].map((l) => ({
      type: 'PutLocationIntoPlay',
      location: l,
    })) as Message[]),
    ...leads.map((code, n): Message => ({
      type: 'PutAssetIntoPlay',
      investigator: ids[n % g.investigators.length]!,
      code,
      noSlot: true,
    })),
  )
  return during(g, (s) => ({
    ...s,
    assets: Object.fromEntries(
      Object.entries(s.assets).map(([id, a]) => [id, leads.includes(a.code) ? { ...a, clues } : a]),
    ),
  }))
}

/** Avanza el acto 2 y responde al interludio (contar la verdad o mentir). */
export function theTruth(game: GameState, answer: 'tellTheTruth' | 'lie' = 'tellTheTruth') {
  let g = during(game, (s) => s, { type: 'AdvanceAct' })
  g = choose(g, `story.excelsior.${answer}`)
  return settle(g)
}
