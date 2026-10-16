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
  /** Perdición sobre la carta de investigador (cuenta para el plan). */
  doom?: number
  /** Le queda la acción adicional que solo sirve para evitar (Trish Scarborough). */
  extraEvade?: boolean
  /** Ya se ha movido este turno. */
  movedThisTurn?: boolean
}

export interface Location {
  id: LocationId
  name: string
  shroud: number
  /** Modificador del velo hasta el final de la ronda (Hand-Crank Flashlight: −1). */
  shroudModifier?: number
  clueValue: number
  cluesPerInvestigator: boolean
  connections: LocationId[]
  revealed: boolean
  clues: number
}

export type EnemyKeyword = 'hunter' | 'aloof' | 'retaliate' | 'alert' | 'doomed'

/** Prey (presa): a quién prefiere enfrentarse el enemigo. */
export type Prey =
  | { type: 'lowestSkill'; skill: SkillType }
  | { type: 'highestSkill'; skill: SkillType }
  /** "Presa (solo X)": solo se enfrenta a ese investigador. */
  | { type: 'only'; investigator: InvestigatorId }

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
  /** Debilidad de un jugador: al salir del juego va a su pila de descartes. */
  owner?: InvestigatorId
  /** No se prepara en la próxima fase de mantenimiento. */
  stayExhausted?: boolean
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
  /** Debilidad de un jugador: al descartarse va a su pila de descartes. */
  owner?: InvestigatorId
  /** Su efecto de revelación se ha cancelado. */
  canceled?: boolean
  /** Fichas (de daño u otras) colocadas sobre la carta. */
  tokens?: number
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
  /** Elemento de la mesa al que se refiere (para elegirlo con un clic). */
  target?: ChoiceTarget
}

/** Una reacción (o habilidad rápida) que un investigador puede usar ahora. */
export interface ReactionOption {
  key: string
  investigator: InvestigatorId
  label: string
  params?: LabelParams
  limit?: AbilityLimit
  target?: ChoiceTarget
  then: Message[]
}

/** Entrada del registro de partida: clave i18n y parámetros. */
export interface LogEntry {
  key: string
  params?: LabelParams
  round: number
}

export interface AbilityUse {
  key: string
  investigator: InvestigatorId
  round: number
}

// ---------------------------------------------------------------------------
// Cartas de jugador
// ---------------------------------------------------------------------------

export type AssetId = string
export type SlotType = 'hand' | 'arcane' | 'accessory' | 'body' | 'ally' | 'head'
export type SkillIcon = SkillType | 'wild'

/** Datos de una carta de jugador (sin texto). */
export interface PlayerCardDef {
  code: CardCode
  name: string
  type: 'investigator' | 'asset' | 'event' | 'skill' | 'treachery' | 'enemy'
  class: string
  traits: string[]
  cost?: number
  xp?: number
  icons?: Partial<Record<SkillIcon, number>>
  slots?: SlotType[]
  health?: number
  sanity?: number
  /** Palabra clave "Rápido": se juega sin gastar acción. */
  fast?: boolean
  uses?: { count: number; type: string }
  /** "Máximo 1 comprometida por prueba de habilidad". */
  commitLimit?: number
  weakness?: string
  unique?: boolean
}

export interface Asset {
  id: AssetId
  code: CardCode
  owner: InvestigatorId
  exhausted: boolean
  damage: number
  horror: number
  /** Usos restantes (munición, cargas, suministros…). */
  uses: number
}

// ---------------------------------------------------------------------------
// Pruebas de habilidad
// ---------------------------------------------------------------------------

export type SkillTestKind =
  | {
      type: 'investigate'
      location: LocationId
      extraClues?: number
      onSuccess?: Message[]
      /** Si se supera por al menos `atLeast`. */
      onSuccessBy?: { atLeast: number; then: Message[] }
    }
  | { type: 'fight'; enemy: EnemyId; extraDamage?: number; onSuccess?: Message[] }
  | { type: 'evade'; enemy: EnemyId; onSuccess?: Message[]; onFail?: Message[] }
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
  /** Mensajes adicionales si la prueba tiene éxito (signo arcano). */
  onSuccess?: Message[]
  /** Se resuelven en cuanto se revela la ficha. */
  immediate?: Message[]
  /** Se resuelven cuando la prueba termina. */
  after?: Message[]
}

export interface SkillTest {
  investigator: InvestigatorId
  skill: SkillType
  difficulty: number
  kind: SkillTestKind
  /** Fichas reveladas (fuera de la bolsa hasta que termina la prueba). */
  /** Modificador del efecto que inició la prueba (p. ej. "+1 [combat] para este ataque"). */
  baseModifier: number
  /** Cartas comprometidas (desde la mano o, con Isabelle, desde la pila de descartes). */
  committed: { code: CardCode; by: InvestigatorId; fromDiscard?: boolean }[]
  /** Apoyo cuya habilidad inició la prueba. */
  source?: AssetId
  /** Etiquetas de la prueba: "parley", "spell", "scenario"… */
  tags?: string[]
  tokenOnSuccess?: Message[]
  tokenAfter?: Message[]
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
  | { kind: 'play'; card: CardCode }
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
  /** `opening`: mano inicial (las debilidades se apartan y se roba otra). */
  | { type: 'DrawCards'; investigator: InvestigatorId; amount: number; opening?: boolean }
  | { type: 'DiscardFromHand'; investigator: InvestigatorId; card: CardCode }
  | { type: 'CheckHandSize'; investigator: InvestigatorId }
  | { type: 'MoveTo'; investigator: InvestigatorId; location: LocationId }
  | { type: 'RevealLocation'; location: LocationId }
  /** En su localización o en `location`. */
  | { type: 'DiscoverClues'; investigator: InvestigatorId; amount: number; location?: LocationId }
  | {
      type: 'BeginSkillTest'
      investigator: InvestigatorId
      skill: SkillType
      difficulty: number
      kind: SkillTestKind
      modifier?: number
      source?: AssetId
      tags?: string[]
    }
  | { type: 'CommitWindow' }
  | { type: 'CommitCard'; investigator: InvestigatorId; code: CardCode }
  /**
   * Juega una carta de la mano pagando su coste (menos `discount`). `effect`
   * sustituye al efecto del evento (cuando depende del momento en que se juega).
   */
  | {
      type: 'PlayCard'
      investigator: InvestigatorId
      code: CardCode
      discount?: number
      effect?: Message[]
    }
  | { type: 'PutAssetIntoPlay'; investigator: InvestigatorId; code: CardCode }
  | { type: 'DiscardAsset'; asset: AssetId }
  /** Cambia el velo de una localización hasta el final de la ronda. */
  | { type: 'ModifyShroud'; location: LocationId; amount: number }
  | { type: 'ExhaustAsset'; asset: AssetId }
  | { type: 'SpendUses'; asset: AssetId; amount: number }
  | { type: 'AssignDamage'; investigator: InvestigatorId; damage: number; horror: number }
  | { type: 'DamageAsset'; asset: AssetId; damage: number; horror: number }
  | { type: 'RevealChaosToken' }
  | { type: 'ResolveSkillTest' }
  | { type: 'EndSkillTest' }
  | { type: 'EngageEnemy'; enemy: EnemyId; investigator: InvestigatorId }
  | { type: 'CheckEngagement'; location: LocationId }
  | { type: 'EnemyAttack'; enemy: EnemyId; investigator: InvestigatorId; exhaustAfter: boolean }
  | { type: 'DamageEnemy'; enemy: EnemyId; amount: number; by?: InvestigatorId }
  | { type: 'DefeatEnemy'; enemy: EnemyId; by?: InvestigatorId }
  | { type: 'EvadeEnemy'; enemy: EnemyId; by?: InvestigatorId }
  | { type: 'ReadyEnemy'; enemy: EnemyId }
  | { type: 'HuntersMove' }
  | { type: 'EnemiesAttack' }
  | { type: 'ReadyAll' }
  /** `direct`: solo puede asignarse a la carta de investigador. */
  | {
      type: 'TakeDamage'
      investigator: InvestigatorId
      damage: number
      horror: number
      direct?: boolean
    }
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
  | {
      type: 'SpawnEnemy'
      card: EnemyCard
      location: LocationId
      engageWith: InvestigatorId | null
      owner?: InvestigatorId
    }
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
  | { type: 'Log'; key: string; params?: LabelParams }
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
  /** Fin del escenario. `told`: los textos de resolución ya se mostraron. */
  | { type: 'EndScenario'; outcome: ScenarioOutcome; told?: boolean }
  /** Texto de historia para leer; el investigador jefe lo cierra o elige una opción. */
  | { type: 'Story'; entry: StoryEntry; choices?: Choice[] }
  | { type: 'Ask'; investigator: InvestigatorId; question: Question }
  // ----- Cartas de jugador -----
  /** Ventana de reacciones a `trigger` (una por investigador, hasta que pasen). */
  | { type: 'Reactions'; trigger: Trigger; used?: string[]; passed?: InvestigatorId[] }
  | { type: 'SpendResources'; investigator: InvestigatorId; amount: number }
  /** +N al valor de la prueba en curso. */
  | { type: 'BoostSkillTest'; amount: number }
  | { type: 'CommitFromDiscard'; investigator: InvestigatorId; code: CardCode }
  /** Ventana tras revelar fichas para comprometer cartas que lo permiten. */
  | { type: 'AfterRevealWindow' }
  | { type: 'CancelRevelation'; treachery: TreacheryId }
  | { type: 'PlaceDoomOnInvestigator'; investigator: InvestigatorId; amount: number }
  | { type: 'HealAsset'; asset: AssetId; damage: number; horror: number }
  | { type: 'ReturnAssetToHand'; asset: AssetId }
  /** De la pila de descartes a la mano. */
  | { type: 'DiscardToHand'; investigator: InvestigatorId; code: CardCode }
  /**
   * Busca en el mazo (o en las `top` primeras) un apoyo con alguno de los rasgos
   * y lo lleva a la mano o lo juega con descuento; luego baraja.
   */
  | {
      type: 'SearchDeck'
      investigator: InvestigatorId
      top?: number
      traits: string[]
      to: 'hand' | 'play'
      discount?: number
    }
  | {
      type: 'TakeFromDeck'
      investigator: InvestigatorId
      code: CardCode
      to: 'hand' | 'play'
      discount?: number
    }
  | { type: 'ShuffleDeck'; investigator: InvestigatorId }
  /** Busca en las primeras cartas del mazo de encuentros un enemigo no Élite y lo roba. */
  | { type: 'SearchEncounterForEnemy'; investigator: InvestigatorId; top: number }
  | { type: 'DisengageAll'; investigator: InvestigatorId }
  /** El investigador elige una localización conectada a la que moverse. */
  | { type: 'ChooseMove'; investigator: InvestigatorId; revealedOnly?: boolean }
  | { type: 'AtEndOfTurn'; investigator: InvestigatorId; then: Message[] }
  /** Premonition: sella una ficha al azar de la bolsa. */
  | { type: 'SealToken'; investigator: InvestigatorId; code: CardCode }
  | { type: 'AddTreacheryTokens'; treachery: TreacheryId; amount: number; discardAt?: number }
  /** Saca una debilidad del juego y la baraja en el mazo de su dueño. */
  | { type: 'ShuffleTreacheryIntoDeck'; treachery: TreacheryId }
  /** Una debilidad robada del mazo se resuelve. */
  | { type: 'ResolveWeakness'; investigator: InvestigatorId; code: CardCode }
  | { type: 'MoveDamage'; from: DamageHolder; to: DamageHolder; kind: 'damage' | 'horror' }
  /** El investigador elige uno de sus apoyos con ese rasgo y vuelve a su mano. */
  | { type: 'ReturnAssetWithTrait'; investigator: InvestigatorId; trait: string }
  /** Slippery: el enemigo no se prepara en la próxima fase de mantenimiento. */
  | { type: 'EnemyStaysExhausted'; enemy: EnemyId }

/** Una carta que puede tener daño u horror. */
export type DamageHolder =
  { type: 'investigator'; id: InvestigatorId } | { type: 'asset'; id: AssetId }

/** Momentos en los que se comprueban las habilidades forzadas. */
export type Trigger =
  | { type: 'afterDiscoverClues'; investigator: InvestigatorId; location: LocationId }
  | { type: 'investigationPhaseEnds' }
  | { type: 'enemyDefeated'; enemy: Enemy; by?: InvestigatorId }
  | { type: 'afterEnemyPhaseAttack'; enemy: EnemyId; investigator: InvestigatorId }
  | { type: 'afterDoomPlaced' }
  | { type: 'afterEnemyAttack'; enemy: EnemyId; investigator: InvestigatorId }
  | {
      type: 'afterSkillTest'
      investigator: InvestigatorId
      kind: SkillTestKind['type']
      succeeded: boolean
      /** Valor final menos dificultad (negativo si falla). */
      margin: number
      enemy?: EnemyId
      location?: LocationId
      source?: AssetId
    }
  | { type: 'afterPlayAsset'; investigator: InvestigatorId; code: CardCode }
  | { type: 'afterAssetEntersPlay'; investigator: InvestigatorId; asset: AssetId }
  | { type: 'afterDrawCard'; investigator: InvestigatorId; card: CardCode }
  | { type: 'enemyEntersLocation'; enemy: EnemyId; location: LocationId }
  | { type: 'whenTreacheryDrawn'; investigator: InvestigatorId; treachery: TreacheryId }
  | { type: 'afterEvade'; investigator: InvestigatorId; enemy: EnemyId }
  | { type: 'afterTakeDamage'; investigator: InvestigatorId; damage: number; horror: number }
  | { type: 'afterAssetDamaged'; asset: AssetId; damage: number; horror: number }
  | { type: 'assetDefeated'; asset: Asset }
  | { type: 'afterEngage'; investigator: InvestigatorId; enemy: EnemyId }
  | { type: 'turnBegins'; investigator: InvestigatorId }
  | { type: 'afterSpendResources'; investigator: InvestigatorId; amount: number }
  | { type: 'afterMove'; investigator: InvestigatorId; first: boolean }
  | { type: 'afterDealDamage'; investigator: InvestigatorId; enemy: EnemyId }

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
  /** Elemento de la mesa al que se refiere (para poder elegirlo con un clic). */
  target?: ChoiceTarget
  /** Cómo dibujar la opción como botón de acción sobre la mesa. */
  display?: ChoiceDisplay
}

/** Acciones con nombre corto propio en los botones de la mesa. */
export type ActionName =
  'investigate' | 'move' | 'fight' | 'evade' | 'engage' | 'draw' | 'resource' | 'play'

/**
 * Datos para dibujar una opción como botón de acción: si es una acción básica
 * o la habilidad de una carta, cuántas acciones cuesta y qué habilidad prueba.
 */
export interface ChoiceDisplay {
  kind: 'basic' | 'ability' | 'play'
  /** Nombre corto de la acción (si no, se usa la etiqueta completa). */
  action?: ActionName
  /** Acciones que cuesta (0 = rápida). */
  actions: number
  skill?: SkillType
}

export type ChoiceTarget =
  | { type: 'location'; id: LocationId }
  | { type: 'enemy'; id: EnemyId }
  | { type: 'treachery'; id: TreacheryId }
  | { type: 'asset'; id: AssetId }
  | { type: 'hand'; code: CardCode }
  | { type: 'investigator'; id: InvestigatorId }
  | { type: 'agenda' }
  | { type: 'act' }

export type Requirement =
  | { type: 'hasClues'; investigator: InvestigatorId }
  | { type: 'hasCardsInHand'; investigator: InvestigatorId }
  | { type: 'hasResources'; investigator: InvestigatorId }

/**
 * Texto de historia (introducción, resolución…): claves i18n del título y del
 * cuerpo, y los efectos de juego que lo acompañan.
 */
export interface StoryEntry {
  title: string
  body: string
  effects?: { key: string; params?: LabelParams }[]
}

export interface Question {
  kind: 'chooseOne'
  /** La pregunta es un texto de historia (la mesa lo muestra en una ventana). */
  story?: StoryEntry
  /** Preguntar aunque solo haya una opción (pausas para que el jugador vea el estado). */
  alwaysAsk?: boolean
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
  /**
   * Modo interactivo (la mesa): las pruebas de habilidad se detienen antes de
   * revelar la ficha y tras conocer el resultado.
   */
  interactive: boolean
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
  /** Investigador cuyo turno está en curso. */
  activeTurn?: InvestigatorId | null
  /** Ataques de enemigos (para "si este enemigo te ha atacado esta ronda"). */
  enemyAttacks?: { enemy: EnemyId; investigator: InvestigatorId; round: number }[]
  /** Efectos pendientes "al final de tu turno". */
  endOfTurn?: { investigator: InvestigatorId; then: Message[] }[]
  /** Fichas selladas sobre cartas (Premonition). */
  sealed?: { token: ChaosToken; investigator: InvestigatorId; code: CardCode }[]
  assets: Record<AssetId, Asset>
  log: LogEntry[]
  skillTest: SkillTest | null
  /** Pila de mensajes pendientes: el primero es el siguiente en procesarse. */
  queue: Message[]
  pending: PendingQuestion | null
  outcome: ScenarioOutcome | null
}
