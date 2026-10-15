import type { RngState } from './rng'

export type PlayerId = string

export type Phase = 'setup' | 'mythos' | 'investigation' | 'enemy' | 'upkeep'

/**
 * Todo lo que puede ocurrir en la partida. Es una unión discriminada que irá
 * creciendo a medida que se implementen reglas.
 */
export type Message =
  | { type: 'BeginRound' }
  | { type: 'BeginPhase'; phase: Phase }
  | { type: 'EndPhase'; phase: Phase }
  | { type: 'GainResources'; player: PlayerId; amount: number }
  | { type: 'Ask'; player: PlayerId; question: Question }

/** Una opción que el jugador puede elegir; al elegirla se encolan sus mensajes. */
export interface Choice {
  /** Clave i18n de la etiqueta que verá el jugador. */
  label: string
  then: Message[]
}

export interface Question {
  kind: 'chooseOne'
  choices: Choice[]
}

export interface PendingQuestion {
  player: PlayerId
  question: Question
}

export interface PlayerState {
  id: PlayerId
  resources: number
}

export interface GameState {
  /** Versión del motor que creó la partida, para migraciones futuras. */
  engineVersion: number
  rng: RngState
  round: number
  phase: Phase
  players: PlayerState[]
  /** Pila de mensajes pendientes: el primero es el siguiente en procesarse. */
  queue: Message[]
  pending: PendingQuestion | null
}

/** Entrada de un jugador: el índice de la opción elegida en la pregunta pendiente. */
export interface PlayerInput {
  player: PlayerId
  choice: number
}
