/** Ayudas de prueba de El juramento inconfesable: partida preparada y estados de mesa. */
import {
  createGame,
  scenarioBehavior,
  type Difficulty,
  type EncounterCard,
  type EnemyCard,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, during, labels, testInvestigator, throughSetup } from '@lcg/engine/testing'
import '../index'
import { ENCOUNTER_SETS } from './encounter-sets'
import {
  CODES,
  locationCards,
  THE_UNSPEAKABLE_OATH,
  theUnspeakableOath,
} from './the-unspeakable-oath'

const IDS = ['a', 'b', 'c', 'd']
export type Mod = (s: GameState) => GameState

export function game(
  players = 1,
  difficulty: Difficulty = 'standard',
  seed = 3,
  notes: string[] = [],
): GameState {
  let state = throughSetup(
    createGame({
      seed,
      interactive: true,
      difficulty,
      investigators: IDS.slice(0, players).map((id) => testInvestigator(id)),
      scenario: theUnspeakableOath({
        difficulty,
        seed,
        log: { notes, crossedOut: [], values: {}, chaosTokens: [], investigators: {} },
      }),
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
export const atAct =
  (index: number): Mod =>
  (s) => ({ ...s, actIndex: index })
export const atAgenda =
  (index: number): Mod =>
  (s) => ({ ...s, agendaIndex: index })
export const prep = (state: GameState, mods: Mod[], ...messages: Message[]) =>
  during(state, (s) => mods.reduce((next, mod) => mod(next), s), ...messages)
export const resolveTest = (state: GameState) =>
  choose(choose(state, 'choice.revealToken'), 'choice.applyResults')
export const halls = (state: GameState) =>
  [CODES.westernWingA, CODES.westernWingB, CODES.easternWingA, CODES.easternWingB].filter(
    (code) => state.locations[code],
  )
export const enemyOf = (state: GameState, code: string) =>
  Object.values(state.enemies).find((e) => e.code === code)
export const behavior = () => scenarioBehavior(THE_UNSPEAKABLE_OATH)!
export const monstersSetAside = (state: GameState) =>
  state.setAside.filter((c) => (c.traits ?? []).includes('Monster') && c.code !== '03065b')
export const ALL = Object.values(ENCOUNTER_SETS).flat()
export const treacheryOf = (code: string): EncounterCard => ({
  kind: 'treachery',
  code,
  name: code,
  traits: ['Terror'],
  keywords:
    code === CODES.giftOfMadnessPity || code === CODES.giftOfMadnessMisery ? ['hidden'] : [],
})
export const draw = (card: EncounterCard, investigator = 'a'): Message => ({
  type: 'ResolveEncounterCard',
  investigator,
  card,
})
export const spawn = (
  card: EnemyCard,
  location: string,
  engageWith: string | null = null,
): Message => ({
  type: 'SpawnEnemy',
  card: { ...card },
  location,
  engageWith,
})
export const reveal = (...locations: string[]): Message[] =>
  locations.map((location) => ({ type: 'RevealLocation', location }))

export function readAll(state: GameState, pick: (ls: string[]) => number = () => 0): GameState {
  let s = state
  for (let n = 0; n < 40 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++) {
    const choice = s.pending.question.choices[pick(labels(s))]!
    s = choose(s, choice.label, choice.params)
  }
  return s
}

/** Pone en juego (revelados) estos Pasillos del manicomio en lugar de los de la partida. */
export const withHalls =
  (...codes: string[]): Mod =>
  (s) => {
    const locations = { ...s.locations }
    for (const code of codes) {
      const card = locationCards[code]!
      const twin = Object.keys(locations).find(
        (id) => id !== code && locationCards[id]?.symbol === card.symbol,
      )
      if (twin) delete locations[twin]
      locations[code] = { ...card, revealed: true, clues: card.clueValue }
    }
    return { ...s, locations }
  }
