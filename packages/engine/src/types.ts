import type { RngState } from './rng'

export type InvestigatorId = string
export type LocationId = string
export type EnemyId = string
export type CardCode = string

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

export type EnemyKeyword = 'hunter' | 'aloof' | 'retaliate' | 'alert'

export interface EnemyCard {
  code: CardCode
  name: string
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

export interface Agenda {
  name: string
  doomThreshold: number
}

export interface Act {
  name: string
  clueThreshold: number
  cluesPerInvestigator: boolean
  /**
   * `anytime`: los investigadores pueden gastar las pistas durante cualquier turno.
   * `endOfRound`: "Objetivo – Al final de la ronda, los investigadores pueden gastar…".
   */
  advanceTiming: 'anytime' | 'endOfRound'
}

// ---------------------------------------------------------------------------
// Pruebas de habilidad
// ---------------------------------------------------------------------------

export type SkillTestKind =
  | { type: 'investigate'; location: LocationId }
  | { type: 'fight'; enemy: EnemyId }
  | { type: 'evade'; enemy: EnemyId }

export interface SkillTest {
  investigator: InvestigatorId
  skill: SkillType
  difficulty: number
  kind: SkillTestKind
  token: ChaosToken | null
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
  | { type: 'SpawnEnemy'; card: EnemyCard; location: LocationId; engageWith: InvestigatorId | null }
  | { type: 'EndScenario'; outcome: ScenarioOutcome }
  | { type: 'Ask'; investigator: InvestigatorId; question: Question }

/** Parámetros que acompañan a una clave i18n (nombres, cantidades…). */
export type LabelParams = Record<string, string | number>

/** Una opción que el jugador puede elegir; al elegirla se encolan sus mensajes. */
export interface Choice {
  /** Clave i18n de la etiqueta que verá el jugador. */
  label: string
  params?: LabelParams
  then: Message[]
}

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
  encounterDeck: EnemyCard[]
  encounterDiscard: EnemyCard[]
  victoryDisplay: CardCode[]
  skillTest: SkillTest | null
  /** Pila de mensajes pendientes: el primero es el siguiente en procesarse. */
  queue: Message[]
  pending: PendingQuestion | null
  outcome: ScenarioOutcome | null
}
