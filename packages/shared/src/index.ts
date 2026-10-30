import type { GameState, PlayerInput } from '@lcg/engine'
export * from './admin'
export * from './online'
export * from './online-game'
export * from './autoSteps'
export * from './cardEntries'
export type {
  AccountUser,
  AuthStatus,
  DocumentKind,
  CloudMetadata,
  CloudDocument,
  DocumentWrite,
} from './accounts'

/** Mensajes del cliente al servidor por WebSocket. */
export type ClientMessage =
  { type: 'join'; gameId: string } | { type: 'answer'; gameId: string; input: PlayerInput }

/** Mensajes del servidor al cliente por WebSocket. */
export type ServerMessage =
  | { type: 'hello'; serverVersion: string }
  | { type: 'state'; gameId: string; state: GameState }
  | { type: 'error'; code: string }

export type Locale = 'en' | 'es'

export const LOCALES: readonly Locale[] = ['en', 'es']

export interface HealthResponse {
  status: 'ok'
  version: string
}
