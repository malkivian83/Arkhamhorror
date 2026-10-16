import type { RngState } from './rng'

export type InvestigatorId = string
export type LocationId = string
export type EnemyId = string
export type TreacheryId = string
export type CardCode = string

export type Difficulty = 'easy' | 'standard' | 'hard' | 'expert'

export type SkillType = 'willpower' | 'intellect' | 'combat' | 'agility'

export type Phase = 'setup' | 'mythos' | 'investigation' | 'enemy' | 'upkeep'

// ---------------------------------------------------------------------------
// Bolsa del caos
// ---------------------------------------------------------------------------

export type ChaosSymbol = 'skull' | 'cultist' | 'tablet' | 'elderThing' | 'elderSign' | 'autoFail'

/** Un número (+1, 0, -1…) o un símbolo. */
export type ChaosToken = number | ChaosSymbol

/** Modificador de los símbolos de escenario (skull, cultist, tablet, elderThing). */
export type ScenarioTokenValues = Partial<
  Record<Exclude<ChaosSymbol, 'elderSign' | 'autoFail'>, number>
>

// ---------------------------------------------------------------------------
// Entidades
// ---------------------------------------------------------------------------

export interface Investigator {
  id: InvestigatorId
  name: string
  skills: Record<SkillType, number>
  health: number
  sanity: number
  /** Modificador del símbolo de signo arcano (el efecto completo vendrá con las cartas). */
  elderSignModifier: number
  damage: number
  horror: number
  resources: number
  clues: number
  location: LocationId | null
  actionsRemaining: number
  turnTaken: boolean
  eliminated: boolean
  /** Se retiró del escenario (también cuenta como eliminado). */
  resigned: boolean
  deck: CardCode[]
  hand: CardCode[]
  discard: CardCode[]
}

export interface Location {
  id: LocationId
  name: string
  shroud: number
  clueValue: number
  cluesPerInvestigator: boolean
  connections: LocationId[]
  revealed: boolean
  clues: number
}

export type EnemyKeyword = 'hunter' | 'aloof' | 'retaliate' | 'alert' | 'doomed'

/** Prey (presa): a quién prefiere enfrentarse el enemigo. */
export type Prey =
  { type: 'lowestSkill'; skill: SkillType } | { type: 'highestSkill'; skill: SkillType }

export interface EnemyCard {
  kind: 'enemy'
  code: CardCode
  name: string
  traits?: string[]
  prey?: Prey
  fight: number
  health: number
  healthPerInvestigator?: boolean
  evade: number
  /** Daño y horror que inflige su ataque. */
  damage: number
  horror: number
  keywords: EnemyKeyword[]
  victory?: number
  /** Instrucciones de aparición: localización concreta. Sin ellas aparece enfrentado a quien lo robó. */
  spawnAt?: LocationId
}

export interface Enemy extends EnemyCard {
  id: EnemyId
  maxHealth: number
  damageTaken: number
  location: LocationId
  engagedWith: InvestigatorId | null
  exhausted: boolean
}

export type TreacheryKeyword = 'peril' | 'surge'

export interface TreacheryCard {
  kind: 'treachery'
  code: CardCode
  name: string
  traits?: string[]
  keywords: TreacheryKeyword[]
}

export type EncounterCard = EnemyCard | TreacheryCard

export type TreacheryPlacement =
  /** Recién robada, resolviendo su revelación. */
  | { type: 'limbo' }
  | { type: 'threatArea'; investigator: InvestigatorId }
  | { type: 'location'; location: LocationId }

export interface Treachery extends TreacheryCard {
  id: TreacheryId
  placement: TreacheryPlacement
}

export interface Agenda {
  /** Código de carta, para buscar su comportamiento (efecto al avanzar, habilidades). */
  code?: CardCode
  name: string
  doomThreshold: number
}

export interface Act {
  code?: CardCode
  name: string
  clueThreshold: number
  cluesPerInvestigator: boolean
  /**
   * `anytime`: los investigadores pueden gastar las pistas durante cualquier turno.
   * `endOfRound`: "Objetivo – Al final de la ronda, los investigadores pueden gastar…".
   * `objective`: avanza al cumplirse la condición de su comportamiento (`objectiveMet`).
   */
  advanceTiming: 'anytime' | 'endOfRound' | 'objective'
  /** Solo pueden gastar pistas los investigadores en esta localización. */
  cluesAtLocation?: LocationId
}

/** Datos de una localización (en juego o apartada). */
export interface LocationCard {
  id: LocationId
  name: string
  shroud: number
  clueValue: number
  cluesPerInvestigator: boolean
  connections: LocationId[]
  victory?: number
}

// ---------------------------------------------------------------------------
// Habilidades activadas
// ---------------------------------------------------------------------------

export interface AbilityLimit {
  per: 'round' | 'game'
  /** Límite de grupo (compartido por todos los investigadores). */
  group?: boolean
}

/**
 * Una habilidad que un investigador puede activar ahora mismo. La generan los
 * comportamientos de las cartas (ver content.ts) cada vez que se abre su menú.
 */
export interface AbilityOption {
  /** Identificador único de la habilidad (para los límites de uso). */
  key: string
  /** Clave i18n y parámetros de la etiqueta. */
  label: string
  params?: LabelParams
  /** Acciones que cuesta (0 = rápida). */
  actions: number
  /** Parlamento y retirarse no provocan ataques de oportunidad. */
  provokes: boolean
  limit?: AbilityLimit
  then: Message[]
}

export interface AbilityUse {
  key: string
  investigator: InvestigatorId
  round: number
}

// ---------------------------------------------------------------------------
// Pruebas de habilidad
// ---------------------------------------------------------------------------

export type SkillTestKind =
  | { type: 'investigate'; location: LocationId }
  | { type: 'fight'; enemy: EnemyId }
  | { type: 'evade'; enemy: EnemyId }
  | {
      /** Prueba exigida por un efecto (traición, plan…). */
      type: 'effect'
      /** Nombre de la carta que la provoca, para mostrarlo. */
      source: string
      onSuccess: Message[]
      onFail: Message[]
      /** Se repite una vez por cada punto por el que se falla. */
      onFailEach: Message[]
    }

/** Lo que aporta una ficha del caos revelada. */
export interface TokenEffect {
  modifier: number
  /** "Revela otra ficha." */
  revealAnother?: boolean
  /** Mensajes adicionales si la prueba falla. */
  onFail?: Message[]
  /** Mensajes adicionales si la prueba falla por al menos `atLeast`. */
  onFailBy?: { atLeast: number; then: Message[] }
}

export interface SkillTest {
  investigator: InvestigatorId
  skill: SkillType
  difficulty: number
  kind: SkillTestKind
  /** Fichas reveladas (fuera de la bolsa hasta que termina la prueba). */
  tokens: ChaosToken[]
  tokenModifier: number
  autoFail: boolean
  tokenOnFail: Message[]
  tokenOnFailBy: { atLeast: number; then: Message[] }[]
  modifiedSkill: number | null
  succeeded: boolean | null
}

// ---------------------------------------------------------------------------
// Acciones, mensajes y preguntas
// ---------------------------------------------------------------------------

export type Action =
  | { kind: 'draw' }
  | { kind: 'resource' }
  | { kind: 'move'; to: LocationId }
  | { kind: 'investigate' }
  | { kind: 'fight'; enemy: EnemyId }
  | { kind: 'evade'; enemy: EnemyId }
  | { kind: 'engage'; enemy: EnemyId }

/** Todo lo que puede ocurrir en la partida. */
export type Message =
  | { type: 'Round' }
  | { type: 'MythosPhase' }
  | { type: 'InvestigationPhase' }
  | { type: 'EnemyPhase' }
  | { type: 'UpkeepPhase' }
  | { type: 'EndOfRound' }
  | { type: 'ChooseNextTurn' }
  | { type: 'BeginTurn'; investigator: InvestigatorId }
  | { type: 'PlayerWindow'; investigator: InvestigatorId }
  | { type: 'EndTurn'; investigator: InvestigatorId }
  | { type: 'TakeAction'; investigator: InvestigatorId; action: Action }
  | { type: 'PerformAction'; investigator: InvestigatorId; action: Action }
  | { type: 'GainResources'; investigator: InvestigatorId; amount: number }
  | { type: 'DrawCards'; investigator: InvestigatorId; amount: number }
  | { type: 'DiscardFromHand'; investigator: InvestigatorId; card: CardCode }
  | { type: 'CheckHandSize'; investigator: InvestigatorId }
  | { type: 'MoveTo'; investigator: InvestigatorId; location: LocationId }
  | { type: 'RevealLocation'; location: LocationId }
  | { type: 'DiscoverClues'; investigator: InvestigatorId; amount: number }
  | {
      type: 'BeginSkillTest'
      investigator: InvestigatorId
      skill: SkillType
      difficulty: number
      kind: SkillTestKind
    }
  | { type: 'RevealChaosToken' }
  | { type: 'ResolveSkillTest' }
  | { type: 'EndSkillTest' }
  | { type: 'EngageEnemy'; enemy: EnemyId; investigator: InvestigatorId }
  | { type: 'CheckEngagement'; location: LocationId }
  | { type: 'EnemyAttack'; enemy: EnemyId; investigator: InvestigatorId; exhaustAfter: boolean }
  | { type: 'DamageEnemy'; enemy: EnemyId; amount: number }
  | { type: 'DefeatEnemy'; enemy: EnemyId }
  | { type: 'EvadeEnemy'; enemy: EnemyId }
  | { type: 'HuntersMove' }
  | { type: 'EnemiesAttack' }
  | { type: 'ReadyAll' }
  | { type: 'TakeDamage'; investigator: InvestigatorId; damage: number; horror: number }
  | { type: 'CheckDefeat'; investigator: InvestigatorId }
  | { type: 'EliminateInvestigator'; investigator: InvestigatorId }
  | { type: 'PlaceDoom'; amount: number }
  | { type: 'CheckAgenda' }
  | { type: 'AdvanceAgenda' }
  | { type: 'OfferActAdvance' }
  | { type: 'AdvanceAct' }
  | { type: 'DrawEncounterCard'; investigator: InvestigatorId }
  | { type: 'ResolveEncounterCard'; investigator: InvestigatorId; card: EncounterCard }
  | { type: 'DrawFromEncounterDiscard'; investigator: InvestigatorId; code: CardCode }
  | { type: 'SpawnEnemy'; card: EnemyCard; location: LocationId; engageWith: InvestigatorId | null }
  | { type: 'RevealTreachery'; treachery: TreacheryId; investigator: InvestigatorId }
  | { type: 'AfterRevelation'; treachery: TreacheryId; investigator: InvestigatorId }
  | { type: 'GainSurge' }
  | { type: 'PlaceTreachery'; treachery: TreacheryId; placement: TreacheryPlacement }
  | { type: 'DiscardTreachery'; treachery: TreacheryId }
  | { type: 'DiscardRandomFromHand'; investigator: InvestigatorId; amount: number }
  | { type: 'LoseResources'; investigator: InvestigatorId; amount: number }
  /** El investigador deja pistas suyas en su localización. */
  | { type: 'PlaceCluesOnLocation'; investigator: InvestigatorId; amount: number }
  | { type: 'Forced'; trigger: Trigger }
  | {
      type: 'UseAbility'
      investigator: InvestigatorId
      key: string
      actions: number
      provokes: boolean
      limit?: AbilityLimit
      then: Message[]
    }
  | { type: 'CheckActObjective' }
  | { type: 'AgendaAdvanced' }
  | { type: 'ActAdvanced' }
  | { type: 'DiscardEnemy'; enemy: EnemyId }
  | { type: 'MoveEnemy'; enemy: EnemyId; location: LocationId }
  | { type: 'PutLocationIntoPlay'; location: LocationId }
  | { type: 'RemoveLocation'; location: LocationId }
  | { type: 'PlaceCluesOnLocationFromPool'; location: LocationId; amount: number }
  | { type: 'SpawnSetAsideEnemy'; code: CardCode; location: LocationId }
  /** Saca un enemigo del juego (curado) y lo vuelve a apartar. */
  | { type: 'SetAsideEnemy'; code: CardCode }
  | { type: 'PlaceSetAsideTreachery'; code: CardCode; placement: TreacheryPlacement }
  /** Mueve copias apartadas al descarte de encuentros (todas, o `count`). */
  | { type: 'MoveSetAsideToEncounterDiscard'; code: CardCode; count?: number }
  /** Gastar pistas "como grupo" (de cualquier investigador). */
  | { type: 'SpendGroupClues'; amount: number }
  /** El investigador elige y descarta cartas de su mano. */
  | { type: 'ChooseDiscardFromHand'; investigator: InvestigatorId; amount: number }
  /** Busca en el mazo y el descarte de encuentros y roba hasta `amount` copias. */
  | { type: 'SearchAndDrawEncounter'; investigator: InvestigatorId; code: CardCode; amount: number }
  | { type: 'Heal'; investigator: InvestigatorId; damage: number; horror: number }
  | { type: 'Resign'; investigator: InvestigatorId }
  | { type: 'DefeatInvestigator'; investigator: InvestigatorId }
  | { type: 'EndScenario'; outcome: ScenarioOutcome }
  | { type: 'Ask'; investigator: InvestigatorId; question: Question }

/** Momentos en los que se comprueban las habilidades forzadas. */
export type Trigger =
  | { type: 'afterDiscoverClues'; investigator: InvestigatorId; location: LocationId }
  | { type: 'investigationPhaseEnds' }
  | { type: 'enemyDefeated'; enemy: Enemy }
  | { type: 'afterEnemyPhaseAttack'; enemy: EnemyId; investigator: InvestigatorId }
  | { type: 'afterDoomPlaced' }

/** Parámetros que acompañan a una clave i18n (nombres, cantidades…). */
export type LabelParams = Record<string, string | number>

/** Una opción que el jugador puede elegir; al elegirla se encolan sus mensajes. */
export interface Choice {
  /** Clave i18n de la etiqueta que verá el jugador. */
  label: string
  params?: LabelParams
  then: Message[]
  /** La opción solo se ofrece si se cumple (se evalúa al mostrar la pregunta). */
  requires?: Requirement
}

export type Requirement =
  | { type: 'hasClues'; investigator: InvestigatorId }
  | { type: 'hasCardsInHand'; investigator: InvestigatorId }
  | { type: 'hasResources'; investigator: InvestigatorId }

export interface Question {
  kind: 'chooseOne'
  /** Clave i18n del enunciado. */
  prompt: string
  choices: Choice[]
}

export interface PendingQuestion {
  investigator: InvestigatorId
  question: Question
}

/** Entrada de un jugador: el índice de la opción elegida en la pregunta pendiente. */
export interface PlayerInput {
  investigator: InvestigatorId
  choice: number
}

export type ScenarioOutcome = { type: 'resolution'; resolution: number } | { type: 'noResolution' }

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------

export interface GameState {
  /** Versión del motor que creó la partida, para migraciones futuras. */
  engineVersion: number
  scenarioId: string
  difficulty: Difficulty
  rng: RngState
  nextId: number
  round: number
  phase: Phase
  /** Orden de jugadores; el primero no eliminado es el investigador jefe. */
  investigators: Investigator[]
  /** Investigadores que empezaron el escenario (para valores "por investigador"). */
  startingInvestigatorCount: number
  locations: Record<LocationId, Location>
  enemies: Record<EnemyId, Enemy>
  agendas: Agenda[]
  agendaIndex: number
  doom: number
  acts: Act[]
  actIndex: number
  chaosBag: ChaosToken[]
  tokenValues: ScenarioTokenValues
  encounterDeck: EncounterCard[]
  encounterDiscard: EncounterCard[]
  /** Cartas apartadas, fuera de juego (para efectos de escenario). */
  setAside: EncounterCard[]
  treacheries: Record<TreacheryId, Treachery>
  /** La carta de encuentros que se está resolviendo ganó oleada. */
  surgePending: boolean
  victoryDisplay: CardCode[]
  /** Localizaciones apartadas que los efectos del escenario pueden poner en juego. */
  setAsideLocations: Record<LocationId, LocationCard>
  abilityUses: AbilityUse[]
  skillTest: SkillTest | null
  /** Pila de mensajes pendientes: el primero es el siguiente en procesarse. */
  queue: Message[]
  pending: PendingQuestion | null
  outcome: ScenarioOutcome | null
}
