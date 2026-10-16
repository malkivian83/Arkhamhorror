/**
 * Registro del comportamiento del contenido (escenarios, localizaciones, plan,
 * acto, traiciones, enemigos…).
 *
 * El estado de la partida solo guarda datos (códigos de carta, id de escenario);
 * el comportamiento vive en código registrado aquí, de modo que el estado sigue
 * siendo JSON y una partida se reconstruye con el mismo contenido cargado.
 */
import type {
  AbilityOption,
  Act,
  Agenda,
  Asset,
  CardCode,
  ChaosSymbol,
  Enemy,
  GameState,
  InvestigatorId,
  Location,
  Message,
  PlayerCardDef,
  SkillTest,
  TokenEffect,
  Treachery,
  Trigger,
} from './types'

export type ScenarioSymbol = Exclude<ChaosSymbol, 'elderSign' | 'autoFail'>

/** Habilidades que `investigator` puede activar en esta carta ahora mismo. */
export type AbilitiesFn<Self> = (
  state: GameState,
  self: Self,
  investigator: InvestigatorId,
) => AbilityOption[]

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
  abilities?: AbilitiesFn<Treachery>
}

export interface EnemyBehavior {
  code: CardCode
  forced?: (state: GameState, trigger: Trigger, self: Enemy) => Message[]
}

export interface LocationBehavior {
  code: CardCode
  /** Solo se ofrecen a investigadores en la localización (ya revelada). */
  abilities?: AbilitiesFn<Location>
  forced?: (state: GameState, trigger: Trigger, self: Location) => Message[]
}

export interface AgendaBehavior {
  code: CardCode
  abilities?: AbilitiesFn<Agenda>
  forced?: (state: GameState, trigger: Trigger, self: Agenda) => Message[]
  /** Instrucciones del reverso al avanzar. */
  onAdvance?: (state: GameState) => Message[]
}

export interface ActBehavior {
  code: CardCode
  abilities?: AbilitiesFn<Act>
  /** Para actos con objetivo de condición (`advanceTiming: 'objective'`). */
  objectiveMet?: (state: GameState) => boolean
  /** Instrucciones del reverso al avanzar. */
  onAdvance?: (state: GameState) => Message[]
}

const scenarios = new Map<string, ScenarioBehavior>()
const treacheries = new Map<CardCode, TreacheryBehavior>()
const enemies = new Map<CardCode, EnemyBehavior>()
const locations = new Map<CardCode, LocationBehavior>()
const agendas = new Map<CardCode, AgendaBehavior>()
const acts = new Map<CardCode, ActBehavior>()

export function registerScenario(behavior: ScenarioBehavior): void {
  scenarios.set(behavior.id, behavior)
}

export function registerTreachery(behavior: TreacheryBehavior): void {
  treacheries.set(behavior.code, behavior)
}

export function registerEnemy(behavior: EnemyBehavior): void {
  enemies.set(behavior.code, behavior)
}

export function registerLocation(behavior: LocationBehavior): void {
  locations.set(behavior.code, behavior)
}

export function registerAgenda(behavior: AgendaBehavior): void {
  agendas.set(behavior.code, behavior)
}

export function registerAct(behavior: ActBehavior): void {
  acts.set(behavior.code, behavior)
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

export function locationBehavior(code: CardCode): LocationBehavior | undefined {
  return locations.get(code)
}

export function agendaBehavior(code: CardCode | undefined): AgendaBehavior | undefined {
  return code === undefined ? undefined : agendas.get(code)
}

export function actBehavior(code: CardCode | undefined): ActBehavior | undefined {
  return code === undefined ? undefined : acts.get(code)
}

// ---------------------------------------------------------------------------
// Cartas de jugador
// ---------------------------------------------------------------------------

export interface PlayerCardBehavior {
  code: CardCode
  /** Evento: su efecto al jugarlo. */
  play?: (state: GameState, investigator: InvestigatorId) => Message[]
  /** Restricción adicional para jugarlo ("solo durante tu turno", "como primera acción"…). */
  canPlay?: (state: GameState, investigator: InvestigatorId) => boolean
  /** Habilidades del apoyo en juego, para su controlador. */
  abilities?: AbilitiesFn<Asset>
  /** Modificador constante a las pruebas de su controlador. */
  skillModifier?: (state: GameState, self: Asset, test: SkillTest) => number
  /** Carta comprometida: efecto según el resultado de la prueba. */
  afterCommittedTest?: (
    state: GameState,
    test: SkillTest,
    succeeded: boolean,
    committedBy: InvestigatorId,
  ) => Message[]
}

const playerCards = new Map<CardCode, PlayerCardDef>()
const playerBehaviors = new Map<CardCode, PlayerCardBehavior>()

export function registerPlayerCards(defs: PlayerCardDef[]): void {
  for (const def of defs) playerCards.set(def.code, def)
}

export function registerPlayerCard(behavior: PlayerCardBehavior): void {
  playerBehaviors.set(behavior.code, behavior)
}

export function playerCardDef(code: CardCode): PlayerCardDef | undefined {
  return playerCards.get(code)
}

export function playerCardBehavior(code: CardCode): PlayerCardBehavior | undefined {
  return playerBehaviors.get(code)
}
