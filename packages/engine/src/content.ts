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
  ChaosToken,
  Enemy,
  EnemyCard,
  GameState,
  Investigator,
  InvestigatorId,
  Location,
  Message,
  PlayerCardDef,
  ReactionOption,
  ScenarioOutcome,
  SkillTest,
  TokenEffect,
  Treachery,
  Trigger,
  SlotType,
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
  /**
   * Textos y decisiones de la resolución (solo en la mesa). Deben terminar con
   * `EndScenario` marcado como `told`, que puede cambiar la resolución final.
   */
  resolution?: (state: GameState, outcome: ScenarioOutcome) => Message[]
}

export interface TreacheryBehavior {
  /** Acciones adicionales para entrar o salir de la localización a la que está unida (Arcane Lock). */
  moveCost?: number
  code: CardCode
  /** Mensajes de su revelación. Si no la coloca en juego, se descarta al terminar. */
  revelation: (state: GameState, investigator: InvestigatorId, self: Treachery) => Message[]
  /** Habilidades forzadas mientras está en juego. */
  forced?: (state: GameState, trigger: Trigger, self: Treachery) => Message[]
  abilities?: AbilitiesFn<Treachery>
  /** En la zona de amenaza: su dueño no puede jugar apoyos ni usar los de sus apoyos (The Necronomicon). */
  blocksAssets?: boolean
}

export interface EnemyBehavior {
  code: CardCode
  forced?: (state: GameState, trigger: Trigger, self: Enemy) => Message[]
  /** Habilidades del enemigo para los investigadores de su localización (parlamento…). */
  abilities?: AbilitiesFn<Enemy>
  /** Reacciones que el enemigo ofrece a los investigadores (códex). */
  reactions?: (state: GameState, trigger: Trigger, self: Enemy) => ReactionOption[]
  /** Modificador a las habilidades de los investigadores de su localización (Whippoorwill). */
  skillModifier?: (state: GameState, self: Enemy, test: SkillTest) => number
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
  /** Reacciones del apoyo en juego (las decide su controlador). */
  reactions?: (state: GameState, trigger: Trigger, self: Asset) => ReactionOption[]
  /** Eventos que se juegan como reacción desde la mano ("Juégala después de…"). */
  handReactions?: (
    state: GameState,
    trigger: Trigger,
    investigator: InvestigatorId,
  ) => ReactionOption[]
  /** Habilidades forzadas del apoyo en juego. */
  forced?: (state: GameState, trigger: Trigger, self: Asset) => Message[]
  /** Habilidades rápidas durante una prueba de su controlador, antes de revelar fichas. */
  testOptions?: (state: GameState, test: SkillTest, self: Asset) => ReactionOption[]
  /** Efecto al revelar una ficha en una prueba iniciada por este apoyo. */
  onTokenRevealed?: (state: GameState, token: ChaosToken, self: Asset) => Message[]
  /** Se puede comprometer después de revelar las fichas (Timely Intervention). */
  commitAfterReveal?: boolean
  /** Evento que se juega cuando vas a fallar una prueba (Scrape By); su efecto es `play`. */
  playWhenFailing?: boolean
  /**
   * Permanente: empieza en juego (fuera del mazo) y da estas ventajas al
   * empezar la partida: cartas extra en la mano inicial, recursos y ranuras.
   */
  permanent?: {
    openingHand?: number
    resources?: number
    slots?: Partial<Record<SlotType, number>>
  }
  /** Coste adicional al comprometerla. */
  onCommit?: (state: GameState, by: InvestigatorId) => Message[]
  /** Aumenta el tamaño máximo de mano de su controlador. */
  handSize?: number
  /** Puede recibir el daño de otros investigadores de su localización (Bodyguard). */
  soaksForOthers?: boolean
  /** Se descarta al quedarse sin usos. */
  discardWhenEmpty?: boolean
  /** Su acción es de evitar (cuenta como tal) o no provoca ataques de oportunidad. */
  evadeAction?: boolean
  noAttacksOfOpportunity?: boolean
  /** Debilidad que cancela las búsquedas en el mazo (Dead Ends). */
  cancelsSearch?: boolean
  /** Debilidad de tipo enemigo: sus valores, para que aparezca al robarla. */
  enemy?: EnemyCard
}

/**
 * Comportamiento de una carta de investigador: efecto del signo arcano,
 * reacciones, habilidades durante sus pruebas y acciones adicionales.
 */
export interface InvestigatorBehavior {
  code: CardCode
  elderSign?: (state: GameState, self: Investigator) => TokenEffect
  reactions?: (state: GameState, trigger: Trigger, self: Investigator) => ReactionOption[]
  testOptions?: (state: GameState, test: SkillTest, self: Investigator) => ReactionOption[]
  /** Una acción adicional cada turno que solo sirve para evitar. */
  extraEvadeAction?: boolean
}

const investigatorBehaviors = new Map<CardCode, InvestigatorBehavior>()

export function registerInvestigator(behavior: InvestigatorBehavior): void {
  investigatorBehaviors.set(behavior.code, behavior)
}

export function investigatorBehavior(code: CardCode): InvestigatorBehavior | undefined {
  return investigatorBehaviors.get(code)
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
