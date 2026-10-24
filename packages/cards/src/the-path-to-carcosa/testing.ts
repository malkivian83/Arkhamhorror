/** Ayudas de prueba de Se cierra el telón: partida preparada y estados de mesa. */
import {
  availableAbilities,
  createGame,
  type Difficulty,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, during, testInvestigator, throughSetup } from '@lcg/engine/testing'
import '../index'
import { CODES, curtainCall } from './curtain-call'
import { THE_MAN_IN_THE_PALLID_MASK } from './the-man-in-the-pallid-mask'

const IDS = ['a', 'b', 'c', 'd']
export type Mod = (s: GameState) => GameState

/** Se cierra el telón preparado con investigadores de prueba, en el primer menú de acciones. */
export function game(players = 1, difficulty: Difficulty = 'standard', seed = 3): GameState {
  let state = throughSetup(
    createGame({
      seed,
      interactive: true,
      difficulty,
      investigators: IDS.slice(0, players).map((id) => testInvestigator(id)),
      scenario: curtainCall({ difficulty }),
    }),
  )
  if (state.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    state = choose(state, 'choice.investigator', { name: 'A' })
  return state
}

/** Coloca a los investigadores (en orden de jugadores) en esos Lugares. */
export const placeAt =
  (...where: string[]): Mod =>
  (s) => ({
    ...s,
    investigators: s.investigators.map((i, n) => ({ ...i, location: where[n] ?? i.location })),
  })

export const withBag =
  (...tokens: GameState['chaosBag']): Mod =>
  (s) => ({ ...s, chaosBag: tokens })

export const update =
  (id: string, changes: Partial<GameState['investigators'][number]>): Mod =>
  (s) => ({
    ...s,
    investigators: s.investigators.map((i) => (i.id === id ? { ...i, ...changes } : i)),
  })

/** Pone en juego (revelados) Lugares apartados o sin revelar, sin sus efectos de revelación. */
export const putInPlay =
  (...codes: string[]): Mod =>
  (s) => {
    const locations = { ...s.locations }
    const setAsideLocations = { ...s.setAsideLocations }
    for (const code of codes) {
      const current = locations[code]
      const card = setAsideLocations[code]
      delete setAsideLocations[code]
      locations[code] = current
        ? { ...current, revealed: true }
        : {
            ...card!,
            connections: [],
            revealed: true,
            clues: card!.clueValue * (card!.cluesPerInvestigator ? s.investigators.length : 1),
          }
    }
    return { ...s, locations, setAsideLocations }
  }

export const horrorOn =
  (location: string, horror = 1): Mod =>
  (s) => ({
    ...s,
    locations: { ...s.locations, [location]: { ...s.locations[location]!, horror } },
  })

/**
 * Aplica los modificadores, resuelve los mensajes y vuelve al menú de acciones. Revelar
 * un Lugar ya revelado solo recalcula las conexiones por símbolos.
 */
export const prep = (state: GameState, mods: Mod[], ...messages: Message[]) =>
  during(
    state,
    (s) => mods.reduce((next, mod) => mod(next), s),
    { type: 'RevealLocation', location: CODES.theatre },
    ...messages,
  )

export const resolveTest = (state: GameState) =>
  choose(choose(state, 'choice.revealToken'), 'choice.applyResults')

export const ability = (state: GameState, key: string, investigator = 'a') => {
  const found = availableAbilities(state, investigator).find((a) => a.key.endsWith(key))
  if (!found) throw new Error(`Habilidad ${key} no disponible`)
  return found
}

export const man = (state: GameState) =>
  Object.values(state.enemies).find((e) => e.code === THE_MAN_IN_THE_PALLID_MASK)

/** Elige la primera opción de la pregunta pendiente. */
export function applyFirst(state: GameState): GameState {
  const [first] = state.pending!.question.choices
  return choose(state, first!.label, first!.params)
}
