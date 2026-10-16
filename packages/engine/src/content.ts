/**
 * Registro del comportamiento del contenido (escenarios, traiciones, enemigos…).
 *
 * El estado de la partida solo guarda datos (códigos de carta, id de escenario);
 * el comportamiento vive en código registrado aquí, de modo que el estado sigue
 * siendo JSON y una partida se reconstruye con el mismo contenido cargado.
 */
import type {
  CardCode,
  ChaosSymbol,
  Enemy,
  GameState,
  InvestigatorId,
  Message,
  TokenEffect,
  Treachery,
  Trigger,
} from './types'

export type ScenarioSymbol = Exclude<ChaosSymbol, 'elderSign' | 'autoFail'>

export interface ScenarioBehavior {
  id: string
  /** Efecto de las fichas de escenario (tarjeta de referencia). */
  tokenEffect?: (
    state: GameState,
    token: ScenarioSymbol,
    investigator: InvestigatorId,
  ) => TokenEffect
}

export interface TreacheryBehavior {
  code: CardCode
  /** Mensajes de su revelación. Si no la coloca en juego, se descarta al terminar. */
  revelation: (state: GameState, investigator: InvestigatorId, self: Treachery) => Message[]
  /** Habilidades forzadas mientras está en juego. */
  forced?: (state: GameState, trigger: Trigger, self: Treachery) => Message[]
}

export interface EnemyBehavior {
  code: CardCode
  forced?: (state: GameState, trigger: Trigger, self: Enemy) => Message[]
}

const scenarios = new Map<string, ScenarioBehavior>()
const treacheries = new Map<CardCode, TreacheryBehavior>()
const enemies = new Map<CardCode, EnemyBehavior>()

export function registerScenario(behavior: ScenarioBehavior): void {
  scenarios.set(behavior.id, behavior)
}

export function registerTreachery(behavior: TreacheryBehavior): void {
  treacheries.set(behavior.code, behavior)
}

export function registerEnemy(behavior: EnemyBehavior): void {
  enemies.set(behavior.code, behavior)
}

export function scenarioBehavior(id: string): ScenarioBehavior | undefined {
  return scenarios.get(id)
}

export function treacheryBehavior(code: CardCode): TreacheryBehavior | undefined {
  return treacheries.get(code)
}

export function enemyBehavior(code: CardCode): EnemyBehavior | undefined {
  return enemies.get(code)
}
