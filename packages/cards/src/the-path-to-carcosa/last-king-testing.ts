/** Ayudas de prueba de El Último Rey: partida preparada y estados de mesa. */
import {
  availableAbilities,
  createGame,
  type Difficulty,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, during, keep, testInvestigator, throughSetup } from '@lcg/engine/testing'
import '../index'
import { bystandersInPlay, theLastKing, VIPS } from './the-last-king'

const IDS = ['a', 'b', 'c', 'd']
export type Mod = (s: GameState) => GameState

/** El Último Rey preparado con investigadores de prueba, en el primer menú de acciones. */
export function game(players = 1, difficulty: Difficulty = 'standard', seed = 3): GameState {
  let state = throughSetup(
    createGame({
      seed,
      interactive: true,
      difficulty,
      investigators: IDS.slice(0, players).map((id) => testInvestigator(id)),
      scenario: theLastKing({ difficulty, seed, players }),
    }),
  )
  if (state.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    state = choose(state, 'choice.investigator', { name: 'A' })
  return state
}

export const placeAt =
  (...where: string[]): Mod =>
  (s) => ({
    ...s,
    investigators: s.investigators.map((i, n) => ({ ...i, location: where[n] ?? i.location })),
  })

export const update =
  (id: string, changes: Partial<GameState['investigators'][number]>): Mod =>
  (s) => ({
    ...s,
    investigators: s.investigators.map((i) => (i.id === id ? { ...i, ...changes } : i)),
  })

export const withBag =
  (...tokens: GameState['chaosBag']): Mod =>
  (s) => ({ ...s, chaosBag: tokens })

export const prep = (state: GameState, mods: Mod[], ...messages: Message[]) =>
  during(state, (s) => mods.reduce((next, mod) => mod(next), s), ...messages)

export const resolveTest = (state: GameState) =>
  choose(choose(state, 'choice.revealToken'), 'choice.applyResults')

export const bystander = (state: GameState, key: string) => {
  const vip = VIPS.find((v) => v.key === key)!
  return bystandersInPlay(state).find((p) => p.code === vip.bystander)!
}

export const whereIs = (state: GameState, key: string) => {
  const p = bystander(state, key)
  return p.placement.type === 'location' ? p.placement.location : ''
}

export const parley = (state: GameState, key: string, investigator = 'a') =>
  availableAbilities(state, investigator).find(
    (a) => a.key === `${bystander(state, key).id}:parley`,
  )

/** Usa una habilidad como acción (paga sus acciones). */
export const use = (state: GameState, found: ReturnType<typeof parley>, investigator = 'a') =>
  during(state, keep, {
    type: 'UseAbility',
    investigator,
    key: found!.key,
    actions: found!.actions,
    provokes: found!.provokes,
    then: found!.then,
  })

export const enemyCode = (state: GameState, code: string) =>
  Object.values(state.enemies).find((e) => e.code === code)
