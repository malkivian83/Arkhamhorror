import type { RngState } from './rng'

export const BOONS = [
  'ancients',
  'athena',
  'destiny',
  'hades',
  'hermes',
  'thoth',
  'osiris',
  'morrigan',
  'persephone',
] as const
export type Boon = (typeof BOONS)[number]
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
  nextAssetFast?: boolean
  fightActionsThisTurn?: number
  roundSkillAdditions?: { from: SkillType; skills: SkillType[]; code: CardCode; round: number }[]
  /** Purchased checkboxes, shared by this investigator's copies of each customizable card. */
  customizations?: Record<CardCode, Record<string, number>>
  /** Lola Hayes: papel elegido (una clase o `neutral`). */
  role?: string
  /** Improvisación: la siguiente carta de su papel que juegue en este turno cuesta menos. */
  nextRoleDiscount?: { amount: number; round: number }
  /** Completed actions, separately from action costs and actions in progress. */
  completedActions?: { phase: Phase; round: number; count: number }
  /** Successful attacks completed by this investigator in the tagged round. */
  successfulAttacks?: { round: number; count: number }
  /** Sum of reductions reserved for this investigator's next test this phase. */
  nextTestDifficulty?: { amount: number; phase: Phase; round: number }
  /** Optional skill substitutions available before committing cards this round. */
  roundSkillReplacements?: { from: SkillType; to: SkillType; code: CardCode; round: number }[]
  /** Round-lasting bonuses; horror is evaluated when calculating the test. */
  roundSkillBonuses?: {
    skill: SkillType
    amount: number | 'horror'
    code: CardCode
    round: number
  }[]
  /** Bonuses with a phase boundary; printed skills remain unchanged. */
  phaseSkillBonuses?: {
    skill: SkillType
    amount: number
    code: CardCode
    phase: Phase
    round: number
  }[]
  /** Tipos de carta que no puede jugar ni comprometer en esta ronda (Languor). */
  blockedTypes?: { cardType: string; round: number }[]
  /** Acciones básicas realizadas en la ronda indicada, por tipo (Frozen in Fear). */
  roundActions?: { round: number; kinds: Action['kind'][] }
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
  /** Delayed action loss during the next turn (At a Crossroads). */
  nextTurnActionLoss?: number
  turnTaken: boolean
  eliminated: boolean
  /** Se retiró del escenario (también cuenta como eliminado). */
  resigned: boolean
  /** Recursos que tenía al quedar eliminado (Fortuna e insensatez: «dejar limpio el casino»). */
  resourcesWhenEliminated?: number
  deck: CardCode[]
  hand: CardCode[]
  discard: CardCode[]
  /** Perdición sobre la carta de investigador (cuenta para el plan). */
  doom?: number
  /** Le queda la acción adicional que solo sirve para evitar (Trish Scarborough). */
  extraEvade?: boolean
  /** Restricted continuous engage actions spent (or lost) in the actual turn. */
  engageActionsUsed?: number
  /** The trait-restricted additional action was used this turn (Marie Lambeau). */
  traitActionUsed?: boolean
  /** Actions spent in the tagged round, including additional actions (Center Stage). */
  spentActions?: { round: number; count: number }
  /** Skill value bonus for their next skill test (The Red Clock: +4). */
  nextTestBonus?: number
  /** Additional actions for their turn later in this round (Stella Clark). */
  roundTurnActions?: { round: number; amount: number }
  /** No chaos tokens for their next skill test during the turn started at this log index. */
  noTokensNextTest?: number
  attackProtection?: { phase: Phase; round: number; nonElite: boolean }
  /** Serialized effects lasting through the investigator's current actual turn. */
  turnSkillEffect?: {
    turn: number
    noTokens?: boolean
    bases?: Partial<Record<SkillType, number>>
    bonuses?: { amount: number; code: CardCode; kinds?: SkillTestKind['type'][]; tags?: string[] }[]
  }
  extraMove?: boolean
  osirisUsed?: boolean
  osirisProtected?: boolean
  /** Ya se ha movido este turno. */
  movedThisTurn?: boolean
  /** Turno (inicio en el registro) de su último movimiento, en el turno de quien sea. */
  lastMoveTurn?: number
  /** Acciones realizadas en este turno. */
  actionsTaken?: number
  /**
   * Cartas apartadas durante la mano inicial: debilidades robadas y las que se
   * cambian en el mulligan. Vuelven al mazo al terminar el mulligan.
   */
  setAsideOpening?: CardCode[]
}

export interface Location {
  /** Recursos colocados en el Lugar (Góndola). */
  resources?: number
  /** Physical single-sided encounter card currently represented by this location. */
  encounterCard?: EncounterLocationCard
  id: LocationId
  name: string
  shroud: number
  turnShroudModifiers?: { turn: number; owner: InvestigatorId; amount: number }[]
  victory?: number
  position?: [number, number]
  symbol?: string
  connectsTo?: string[]
  unrevealed?: { symbol: string; connectsTo: string[] }
  enterCost?: number
  /** Coste adicional de entrar sin revelar: recibir este horror (Lantern Chamber). */
  enterHorror?: number
  /** Conexiones que no salen de los símbolos (colocadas por un efecto), en ambos sentidos. */
  extraConnections?: LocationId[]
  investigateExtraActions?: number
  /** Cartas de encuentro boca abajo debajo de la localización. */
  beneath?: EncounterCard[]
  /** Nombre de la cara sin revelar, si es distinto (Puerta del vestíbulo). */
  unrevealedName?: string
  /** Fichas de horror y perdición sobre la localización (la perdición cuenta para el plan). */
  horror?: number
  doom?: number
  /** Modificador del velo hasta el final de la ronda (Hand-Crank Flashlight: −1). */
  shroudModifier?: number
  clueValue: number
  cluesPerInvestigator: boolean
  connections: LocationId[]
  revealed: boolean
  clues: number
}

export type EnemyKeyword =
  'hunter' | 'aloof' | 'retaliate' | 'alert' | 'doomed' | 'elusive' | 'massive' | 'surge'

/** Prey (presa): a quién prefiere enfrentarse el enemigo. */
export type Prey =
  | { type: 'mostAssets'; code: CardCode }
  | { type: 'fewestCards' }
  | { type: 'lowestSkill'; skill: SkillType }
  | { type: 'highestSkill'; skill: SkillType }
  /** "Presa (solo X)": solo se enfrenta a ese investigador. */
  | { type: 'only'; investigator: InvestigatorId }
  /** A preferred investigator breaks ties, without the restriction "only". */
  | { type: 'investigator'; investigator: InvestigatorId }
  | { type: 'mostResources' }
  | { type: 'mostClues' }
  | { type: 'mostHorror' }
  | { type: 'mostRemainingSanity' }
  | { type: 'lowestRemainingSanity' }
  | { type: 'lowestRemainingHealth' }

export interface EnemyCard {
  /** En juego sin ocupar un Lugar; location es la cadena vacía, nunca un Lugar ficticio. */
  global?: boolean
  /** Printed fight, health and evade are dashes, not zero-valued statistics. */
  hasNoStats?: boolean
  /** Original code of a player card represented by a face-down enemy. */
  originalCardCode?: CardCode
  /** Entra en juego con esta perdición (Zealot). */
  startingDoom?: number
  /** No hace ataques de oportunidad. */
  noOpportunityAttacks?: boolean
  cannotBeEvaded?: boolean
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
  spawnFarthestEmpty?: boolean
}

export interface Enemy extends EnemyCard {
  /** Investigadores a los que no atacará esta ronda. */
  spares?: { investigator: InvestigatorId; round: number }[]
  /** Keywords gained until the end of the tagged round (Pay Your Dues: aloof). */
  roundKeywords?: { keyword: EnemyKeyword; round: number }[]
  /** Perdición sobre el enemigo (cuenta para el plan). */
  doom?: number
  /** Recursos puestos como "pistas" del códex (Smoke and Mirrors). */
  leads?: number
  /** Pistas sobre el enemigo (Agente de Arkham, Espectro vengativo). */
  clues?: number
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
  /** Ronda en la que se movió por Cazador o Errante (Glotón del manicomio, El organista). */
  huntedRound?: number
  /** Ronda en cuya fase de enemigos no ataca (El organista, Byakhee veloz). */
  noAttackRound?: number
}

/** `hidden`: Oculto (El camino a Carcosa), se añade en secreto a la mano. */
export type TreacheryKeyword = 'peril' | 'surge' | 'hidden'

export interface TreacheryCard {
  kind: 'treachery'
  code: CardCode
  name: string
  traits?: string[]
  keywords: TreacheryKeyword[]
}

export interface EncounterLocationCard extends Omit<LocationCard, 'id'> {
  kind: 'location'
  code: CardCode
  traits?: string[]
  keywords: 'surge'[]
}
export type EncounterCard = EnemyCard | TreacheryCard | EncounterLocationCard

export type TreacheryPlacement =
  /** Recién robada, resolviendo su revelación. */
  | { type: 'limbo' }
  | { type: 'threatArea'; investigator: InvestigatorId }
  | { type: 'location'; location: LocationId }
  /** Vinculada a un enemigo: se descarta cuando el enemigo abandona el juego. */
  | { type: 'enemy'; enemy: EnemyId }
  /** En juego junto al mazo de Plan o de Acto (Un público difícil, Cieno e impurezas). */
  | { type: 'agenda'; code?: CardCode }
  | { type: 'act'; code: CardCode }

export interface Treachery extends TreacheryCard {
  id: TreacheryId
  placement: TreacheryPlacement
  /** Debilidad de un jugador: al descartarse va a su pila de descartes. */
  owner?: InvestigatorId
  /** Su efecto de revelación se ha cancelado. */
  canceled?: boolean
  /** Fichas (de daño u otras) colocadas sobre la carta. */
  tokens?: number
  /** Pistas y horror sobre la carta (Cerebro extraído). */
  clues?: number
  horror?: number
  /**
   * Oculto (El camino a Carcosa): está en secreto en la mano de su investigador. Se
   * trata como si estuviera en su zona de amenaza y cuenta para el tamaño de mano.
   */
  hidden?: boolean
}

export interface Agenda {
  /** Código de carta, para buscar su comportamiento (efecto al avanzar, habilidades). */
  code?: CardCode
  name: string
  /** null: this agenda has no printed doom threshold. */
  doomThreshold: number | null
}

/** Mazo de Plan: el principal (`agendas`) o el segundo (`secondAgenda`). */
export type AgendaDeck = 'first' | 'second'

export interface SecondAgendaDeck {
  agendas: Agenda[]
  index: number
  doom: number
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
  /** Posición en la mesa (columna, fila). */
  position?: [number, number]
  /** Símbolo y conexiones por símbolo (si se dan, las conexiones se calculan con ellos). */
  symbol?: string
  connectsTo?: string[]
  /** Símbolo y conexiones de la cara sin revelar, si son distintos. */
  unrevealed?: { symbol: string; connectsTo: string[] }
  /** Mientras no está revelada, entrar cuesta estas pistas por investigador, en grupo. */
  enterCost?: number
  /** Acciones adicionales que cuesta investigar aquí (Waterfront District). */
  investigateExtraActions?: number
  /** Coste adicional de entrar sin revelar: recibir este horror (Lantern Chamber). */
  enterHorror?: number
  /** Cartas de encuentro boca abajo debajo de la localización (Smoke and Mirrors). */
  beneath?: EncounterCard[]
  /** Nombre de la cara sin revelar, si es distinto (Puerta del vestíbulo). */
  unrevealedName?: string
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
  per: 'turn' | 'round' | 'game' | 'phase'
  /** Límite de grupo (compartido por todos los investigadores). */
  group?: boolean
}

/**
 * Una habilidad que un investigador puede activar ahora mismo. La generan los
 * comportamientos de las cartas (ver content.ts) cada vez que se abre su menú.
 */
export interface AbilityOption {
  /** Printed action designator, when the ability performs a named action. */
  actionKind?: ActionName
  /** Identificador único de la habilidad (para los límites de uso). */
  key: string
  /** Clave i18n y parámetros de la etiqueta. */
  label: string
  params?: LabelParams
  /** Acciones que cuesta (0 = rápida). */
  actions: number
  /** Parlamento y retirarse no provocan ataques de oportunidad. */
  provokes: boolean
  /** Es una habilidad de negociar (costes adicionales como ¿Qué has hecho?). */
  parley?: boolean
  limit?: AbilityLimit
  /** Non-action costs are paid before attacks of opportunity and effects. */
  costs?: Message[]
  playFromDiscard?: { code: CardCode; discount: number }
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
  phase?: Phase
  key: string
  investigator: InvestigatorId
  round: number
  /** Position of the latest turn-begins event, for per-turn limits. */
  turn?: number
}

// ---------------------------------------------------------------------------
// Cartas de jugador
// ---------------------------------------------------------------------------

export type AssetId = string
export type SlotType = 'hand' | 'arcane' | 'accessory' | 'body' | 'ally' | 'head' | 'tarot'
export type SkillIcon = SkillType | 'wild'

/** Datos de una carta de jugador (sin texto). */
/** Opción de construcción de mazo del reverso de un investigador. */
export interface DeckOption {
  /** Empty: any class, when the option is defined by traits. */
  classes: string[]
  maxLevel: number
  /** The card must also have one of these traits (Father Mateo: Blessed cards level 0–3). */
  traits?: string[]
}

/** Opción de construcción que añade una carta (Collector: "un apoyo Relic o Charm…"). */
export interface ExtraDeckOption {
  type: PlayerCardDef['type']
  /** Debe tener alguno de estos rasgos. */
  traits: string[]
  maxLevel: number
  /** Cuántas cartas permite. */
  count: number
}

export interface PlayerCardDef {
  /** Printed subtitle distinguishes mechanically different researched upgrades sharing a title. */
  subname?: string
  /** Upgrade sheet: stable option id -> number of experience checkboxes required. */
  customizable?: Record<string, number>
  code: CardCode
  name: string
  /** Investigadores: tamaño del mazo, opciones de construcción y cartas exclusivas. */
  deckSize?: number
  skills?: Record<SkillType, number>
  elderSignModifier?: number
  deckOptions?: DeckOption[]
  excludedDeckTraits?: string[]
  offClassLevelZeroLimit?: number
  /** Classes those other level 0 cards may belong to (Marie Lambeau: Seeker and/or Survivor). */
  offClassLevelZeroClasses?: string[]
  /** Experience added when a campaign begins (Father Mateo: 5). */
  bonusExperience?: number
  /** "Al menos `min` cartas de cada una de `count` clases distintas" (Lola Hayes). */
  classMinimum?: { classes: string[]; count: number; min: number }
  /** Cartas exclusivas; un código repetido exige esas copias (Lola Hayes: 2 y 2). */
  signatures?: CardCode[]
  type: 'investigator' | 'asset' | 'event' | 'skill' | 'treachery' | 'enemy'
  class: string
  /** Printed factions for multiclass cards; class remains the primary faction. */
  classes?: string[]
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
  /** Recompensa: solo si se ha ganado y solo al crear el mazo. */
  reward?: boolean
  /** Story status is independent of printed traits. */
  story?: boolean
  /** Máximo de copias en un mazo (2 si no se indica). */
  deckLimit?: number
  /** Exceptional: costs twice its level in experience; one copy per deck (by title). */
  exceptional?: boolean
  /** Cartas de mazo adicionales (Collector: +5). */
  deckSizeBonus?: number
  extraDeckOption?: ExtraDeckOption
}

/** Dónde está un apoyo sin dueño. */
export type AssetPlacement =
  { type: 'location'; location: LocationId } | { type: 'enemy'; enemy: EnemyId }

export type PlacedAssetId = string

/** Apoyo sin dueño en juego: en una localización o vinculado a un enemigo. */
export interface PlacedAsset {
  id: PlacedAssetId
  code: CardCode
  name: string
  placement: AssetPlacement
  /** Boca abajo (Invitado hechizado). */
  faceDown?: boolean
  exhausted: boolean
  damage: number
  horror: number
  doom?: number
  /** Uses survive control changes and spellbinding, including zero. */
  uses?: number
  /** Pistas sobre el apoyo (Transeúntes de El Último Rey). */
  clues?: number
}

/** Carta de Historia en juego junto al acto (facción aliada, rival…). */
export interface StoryCardInPlay {
  code: CardCode
  name: string
  clues: number
  horror?: number
  /** Daño y estado de un enemigo representado como carta junto al acto (Hastur). */
  damage?: number
  health?: number
  exhausted?: boolean
}

export interface Asset {
  /** Current form of a transforming asset, reset when it leaves play. */
  form?: string
  /** Printed upgrades retain their owner's sheet when control changes. */
  customization?: Record<string, number>
  /** Player events attached to this instance; owner is retained on control changes. */
  upgrades?: { code: CardCode; owner: InvestigatorId; exhausted?: boolean }[]
  /** Skill bonus for the next fight using this asset this turn (Iron Sights). */
  nextFightBonus?: number
  originalOwner?: InvestigatorId
  /** Perdición sobre el apoyo (cuenta para el plan). */
  doom?: number
  /** No ocupa ranura (Dr. Henry Armitage en Smoke and Mirrors). */
  noSlot?: boolean
  id: AssetId
  code: CardCode
  owner: InvestigatorId
  exhausted: boolean
  damage: number
  horror: number
  /** Usos restantes (munición, cargas, suministros…). */
  uses: number
  /** Pistas sobre el apoyo (Apoyos Indicio de Asesinato en el hotel Excelsior). */
  clues?: number
}

// ---------------------------------------------------------------------------
// Pruebas de habilidad
// ---------------------------------------------------------------------------

export type SkillTestKind =
  | {
      type: 'investigate'
      location: LocationId
      extraClues?: number
      /** Replace only the basic clue, retaining additional clues from committed cards. */
      baseClues?: number
      replaceClue?: boolean
      onSuccess?: Message[]
      /** Si se supera por al menos `atLeast`. */
      onSuccessBy?: { atLeast: number; then: Message[] }
      onFail?: Message[]
    }
  | {
      type: 'fight'
      enemy: EnemyId
      /** Keywords granted or ignored only for this attack. */
      ignoreRetaliate?: boolean
      forceRetaliate?: boolean
      onFail?: Message[]
      extraDamage?: number
      /** Si tiene éxito no inflige daño, solo `onSuccess` (Tomo de rituales, v. IV). */
      noDamage?: boolean
      onSuccess?: Message[]
      /** Si este ataque derrota al enemigo. */
      onDefeat?: Message[]
      /** +1 daño por cada punto por el que se supera, hasta este máximo (Winchester). */
      bonusPerSuccess?: number
      /** Al fallar contra un enemigo enfrentado con otro: 1 daño por punto fallado, hasta este máximo. */
      failDamagePerPoint?: number
      damageIfNoResources?: number
      damageFromClues?: number
      /** Extra damage only when the successful attack reaches this margin. */
      damageIfSuccessBy?: { atLeast: number; amount: number }
      /** Instead of the standard damage, 1 per point succeeded by (minimum 1). */
      damagePerSuccess?: { max: number }
      /** Extra damage if any of these tokens was revealed during the attack. */
      damageIfTokens?: { tokens: ChaosToken[]; amount: number }
    }
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
      /** Se repite una vez por cada punto por el que se supera (antes de `onSuccess`). */
      onSuccessEach?: Message[]
    }

/** Card a chaos token is sealed on; a committed skill card holds it until the test ends. */
export type SealHolder =
  | { type: 'asset'; id: AssetId }
  | { type: 'enemy'; id: EnemyId }
  | { type: 'committed'; code: CardCode; by: InvestigatorId }

/** Lo que aporta una ficha del caos revelada. */
export interface TokenEffect {
  modifier: number
  /** La ficha cuenta como fallo automático (Queen of Ash, difícil, en el lugar del ritual). */
  autoFail?: boolean
  /** "Revela otra ficha." */
  revealAnother?: boolean
  /** Mensajes adicionales si la prueba falla. */
  onFail?: Message[]
  /** Mensajes adicionales si la prueba falla por al menos `atLeast`. */
  onFailBy?: { atLeast: number; then: Message[] }
  /** Mensajes adicionales si la prueba tiene éxito (signo arcano). */
  onSuccess?: Message[]
  /** RR Automatic Success: the test succeeds with a total difficulty of 0 (Wendy Adams). */
  autoSucceed?: boolean
  /** Mensajes si la prueba falla o se supera por menos de `margin`. */
  onSuccessBelow?: { margin: number; then: Message[] }
  /** Se resuelven en cuanto se revela la ficha. */
  immediate?: Message[]
  /** Se resuelven cuando la prueba termina. */
  after?: Message[]
}

export interface SkillTest {
  /** Replaces the normal outcome without changing the kind or success windows. */
  replacementResults?: Message[]
  /** The message that initiated it, to attempt the same test again (Live and Learn). */
  origin?: Extract<Message, { type: 'BeginSkillTest' }>
  /** Granny Orne: the test fails by this much more (or less, if negative). */
  failByModifier?: number
  /** No chaos tokens are revealed: steps 3 and 4 are skipped (Will to Survive, Shed a Light). */
  noTokens?: boolean
  /** Complete deferred windows/effects, in order, after this test ends. */
  afterEnd?: Message[]
  /** Replacement base value before modifiers and committed icons. */
  baseSkill?: number
  /** True only for the standard fight, evade or investigate action. */
  basicAction?: boolean
  /** Preserve the unmodified difficulty so factors precede committed additive modifiers. */
  baseDifficulty?: number
  difficultyFactor?: number
  ignoredEnemyKeywords?: EnemyKeyword[]
  addedEnemyKeywords?: EnemyKeyword[]
  resultRepetitions?: number
  abilityCounts?: Record<string, number>
  investigator: InvestigatorId
  skill: SkillType
  difficulty: number
  kind: SkillTestKind
  difficultyReduction?: number
  /** Fichas reveladas (fuera de la bolsa hasta que termina la prueba). */
  /** Modificador del efecto que inició la prueba (p. ej. "+1 [combat] para este ataque"). */
  baseModifier: number
  /** Cartas comprometidas (desde la mano o, con Isabelle, desde la pila de descartes). */
  committed: {
    code: CardCode
    by: InvestigatorId
    fromDiscard?: boolean
    /** Tras la prueba va al fondo del mazo de su dueño (Habitación 245). */
    toDeckBottom?: boolean
  }[]
  /** Apoyo cuya habilidad inició la prueba. */
  source?: AssetId
  /** Event whose resolving effect initiated this test; independent of asset sources. */
  effectSource?: CardCode
  /** Etiquetas de la prueba: "parley", "spell", "scenario"… */
  tags?: string[]
  tokenOnSuccess?: Message[]
  tokenOnSuccessBelow?: { margin: number; then: Message[] }[]
  tokenAfter?: Message[]
  tokens: ChaosToken[]
  /** Sin iconos ni efectos de las cartas de habilidad comprometidas ([tablet] de El Fantasma). */
  skillCardsCanceled?: boolean
  tokenModifier: number
  autoFail: boolean
  tokenOnFail: Message[]
  tokenOnFailBy: { atLeast: number; then: Message[] }[]
  modifiedSkill: number | null
  succeeded: boolean | null
  /** Al revelar, se sacan 2 fichas y este investigador elige cuál resolver (Mask of Silenus). */
  chooseToken?: InvestigatorId
  /** Fichas sacadas pero ignoradas: vuelven a la bolsa al terminar la prueba. */
  ignoredTokens?: ChaosToken[]
  /** La prueba tiene éxito por 0 pase lo que pase (Scrape By). */
  forcedSuccess?: boolean
  /** RR Automatic Success from a resolved token; automatic failure still prevails. */
  autoSucceed?: boolean
  /** Token held during its "when revealed" window, and what it is treated as. */
  revealing?: { token: ChaosToken; face: ChaosToken }
  /** Revealed tokens treated as another symbol; the physical token returns to the bag. */
  treatedAs?: { token: ChaosToken; face: ChaosToken }[]
  /** Solo se puede comprometer la carta superior de la pila de descartes (Habitación 245). */
  commitRule?: 'discardTop'
  /** Resources paid as additional costs to commit cards, by card code ("Watch this!"). */
  commitPayments?: Record<CardCode, number>
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

/**
 * Pasos de las fases (reglamento, "Round Structure"): 1.x mitos, 2.x investigación,
 * 3.x enemigos y 4.x mantenimiento.
 */
export type PhaseStep =
  | 'mythosBegins'
  | 'placeDoom'
  | 'checkDoom'
  | 'drawEncounter'
  | 'mythosEnds'
  | 'investigationBegins'
  | 'turnBegins'
  | 'takeActions'
  | 'turnEnds'
  | 'investigationEnds'
  | 'enemyBegins'
  | 'huntersMove'
  | 'resolveAttacks'
  | 'enemyEnds'
  | 'upkeepBegins'
  | 'resetActions'
  | 'readyExhausted'
  | 'drawAndGainResource'
  | 'checkHandSize'
  | 'upkeepEnds'

/** Todo lo que puede ocurrir en la partida. */
export type Message =
  | { type: 'GameBegins' }
  | { type: 'AdjustPendingEnemyDamage'; enemy: EnemyId; amount: number }
  | { type: 'ReducePendingDamage'; investigator: InvestigatorId; damage: number; horror: number }
  | { type: 'GainFightActionsThisTurn'; investigator: InvestigatorId; amount: number }
  | {
      type: 'RoundSkillAddition'
      investigator: InvestigatorId
      from: SkillType
      skills: SkillType[]
      code: CardCode
    }
  | {
      type: 'RoundSkillReplacement'
      investigator: InvestigatorId
      from: SkillType
      to: SkillType
      code: CardCode
    }
  | {
      type: 'RoundSkillBonus'
      investigator: InvestigatorId
      skill: SkillType
      amount: number | 'horror'
      code: CardCode
    }
  | {
      type: 'PhaseSkillBonus'
      investigator: InvestigatorId
      skill: SkillType
      amount: number
      code: CardCode
    }
  | {
      type: 'PlayerCardEffect'
      code: CardCode
      investigator: InvestigatorId
      step: string
      data?: Record<string, string | number | boolean>
    }
  | { type: 'ApplySkillTestResults'; prepared?: boolean }
  | {
      type: 'ResolveCancelableTestResults'
      remaining: { label: string; params?: Record<string, string>; then: Message[] }[]
      cancel?: boolean
    }
  | {
      type: 'ModifySkillTest'
      skill?: SkillType
      ignoredEnemyKeywords?: EnemyKeyword[]
      addedEnemyKeywords?: EnemyKeyword[]
      difficultyFactor?: number
      resultRepetitions?: number
      extraDamage?: number
      use?: string
      after?: Message[]
      /** Resolved with the results if the test succeeds (High Roller). */
      onSuccess?: Message[]
      /** Investigar con éxito no descubre pistas (Pruebas incriminatorias). */
      replaceClue?: boolean
    }
  | { type: 'SpendAdditionalAction'; investigator: InvestigatorId; then: Message[] }
  | { type: 'EndCurrentTurn'; investigator: InvestigatorId }
  | { type: 'TransferResources'; from: InvestigatorId; to: InvestigatorId; amount: number }
  /** Move uses into a resource pool; this is not gaining resources. */
  | { type: 'MoveUsesToResources'; asset: AssetId; investigator: InvestigatorId; amount: number }
  | { type: 'TransferAssets'; transfers: { asset: AssetId; to: InvestigatorId }[] }
  | { type: 'EventToVictory'; investigator: InvestigatorId; code: CardCode; points: number }
  | { type: 'BoonMorrigan'; investigator: InvestigatorId; candidates: CardCode[] }
  | { type: 'BoonWeakness'; investigator: InvestigatorId; candidates: CardCode[] }
  | { type: 'BoonAcceptAutofail' }
  | { type: 'BoonDestiny'; investigator: InvestigatorId }
  | { type: 'BoonKeepCard'; investigator: InvestigatorId; card: CardCode }
  | { type: 'BoonOsiris'; investigator: InvestigatorId }
  | { type: 'Round' }
  | { type: 'MythosPhase' }
  /** Empieza un paso de fase: la mesa lo resalta y queda en el registro. */
  | { type: 'Step'; step: PhaseStep; investigator?: InvestigatorId }
  | { type: 'InvestigationPhase' }
  | { type: 'EnemyPhase' }
  | { type: 'UpkeepPhase' }
  | { type: 'EndOfRound' }
  | { type: 'ChooseNextTurn' }
  | { type: 'BeginTurn'; investigator: InvestigatorId }
  | { type: 'PlayerWindow'; investigator: InvestigatorId }
  | { type: 'InvestigatorFastWindow' }
  | { type: 'EndTurn'; investigator: InvestigatorId }
  | { type: 'TakeAction'; investigator: InvestigatorId; action: Action }
  | {
      type: 'CompleteAction'
      investigator: InvestigatorId
      phase: Phase
      round: number
      /** Tipo de acción completada (para `afterAction` del escenario). */
      kind?: Action['kind'] | 'activate'
    }
  | { type: 'PerformAction'; investigator: InvestigatorId; action: Action; entryPaid?: boolean }
  /** `basic`: la acción de recurso o el mantenimiento (no es el efecto de una carta). */
  | {
      type: 'GainResources'
      investigator: InvestigatorId
      amount: number
      basic?: boolean
      /** The upkeep phase resources (Dark Horse may decline them). */
      upkeep?: boolean
    }
  | {
      type: 'DrawCards'
      drawnCount?: number
      drawnCards?: CardCode[]
      investigator: InvestigatorId
      amount: number
      revelations?: CardCode[]
      /** All In: count weaknesses in the draw, then shuffle them back unresolved. */
      shuffleWeaknesses?: boolean
      drawnWeaknesses?: CardCode[]
    }
  | { type: 'ShuffleDrawnWeaknesses'; investigator: InvestigatorId; codes: CardCode[] }
  | { type: 'ResolveDrawnRevelations'; investigator: InvestigatorId; cards: CardCode[] }
  | { type: 'ResolvePlayerRevelation'; investigator: InvestigatorId; code: CardCode }
  | { type: 'DiscardResolvedRevelation'; investigator: InvestigatorId; code: CardCode }
  | { type: 'ResolveOpeningRevelations' }
  | { type: 'AfterCurrentSkillTest'; then: Message[] }
  | { type: 'TakeImmediateAction'; investigator: InvestigatorId }
  | { type: 'ImmediateActionWindow'; investigator: InvestigatorId }
  | { type: 'RestoreImmediateAction' }
  | { type: 'LoseNextTurnActions'; investigator: InvestigatorId; amount: number }
  // ----- Inicio de la partida (reglamento, "Setup", pasos de los investigadores) -----
  /** El grupo elige al investigador jefe. */
  | { type: 'ChooseLead'; replacement?: boolean }
  | { type: 'SetLead'; investigator: InvestigatorId; replacement?: boolean }
  /** Mano inicial: las debilidades se apartan y se roba otra en su lugar. */
  | { type: 'DrawOpeningHand'; investigator: InvestigatorId; amount: number }
  /** Lola Hayes: su papel (una clase o `neutral`). */
  | { type: 'SetRole'; investigator: InvestigatorId; role: string }
  /** Improvisación: hasta el final del turno, la siguiente carta del papel cuesta menos. */
  | { type: 'SetNextRoleDiscount'; investigator: InvestigatorId; amount: number }
  /** Cada investigador hace su mulligan, en orden de jugadores (empezando por el jefe). */
  | { type: 'InvestigatorsMulligan' }
  /** Mulligan: el investigador aparta las cartas que quiera de su mano inicial (una vez). */
  | { type: 'Mulligan'; investigator: InvestigatorId; count?: number }
  | { type: 'MulliganCard'; investigator: InvestigatorId; card: CardCode; count: number }
  /** Roba tantas cartas como apartó y baraja las apartadas en el mazo. */
  /** `startingDone`: the Starting card search was offered. */
  | { type: 'FinishMulligan'; investigator: InvestigatorId; count: number; startingDone?: boolean }
  | { type: 'DiscardFromHand'; investigator: InvestigatorId; card: CardCode }
  | { type: 'CheckHandSize'; investigator: InvestigatorId }
  /** `checked`: el escenario ya resolvió lo que ocurre al intentar moverse (Vestíbulo). */
  | {
      type: 'MoveTo'
      /** Forced relocation that cannot be cancelled (Another Dimension). */
      unpreventable?: boolean
      encounterEffect?: boolean
      investigator: InvestigatorId
      location: LocationId
      entryPaid?: boolean
      checked?: boolean
      /** Additional movement costs already resolved for individual treacheries. */
      checkedTreacheries?: TreacheryId[]
      /** Lo produce la acción básica de movimiento (Palcos), no el efecto de una carta. */
      moveAction?: boolean
    }
  | { type: 'RevealLocation'; location: LocationId; investigator?: InvestigatorId }
  /** En su localización o en `location`. */
  | {
      type: 'DiscoverClues'
      investigator: InvestigatorId
      amount: number
      location?: LocationId
      investigating?: boolean
    }
  | {
      type: 'BeginSkillTest'
      autoSuccess?: boolean
      /** The investigator already chose whether to replace the tested skill. */
      skillSelected?: boolean
      baseSkill?: number
      basicAction?: boolean
      investigator: InvestigatorId
      skill: SkillType
      difficulty: number
      kind: SkillTestKind
      modifier?: number
      source?: AssetId
      effectSource?: CardCode
      tags?: string[]
      /** Solo se puede comprometer la carta superior de la pila de descartes (Habitación 245). */
      commitRule?: 'discardTop'
    }
  | {
      type: 'ReduceNextTestDifficulty'
      investigator: InvestigatorId
      amount: number
      phase: Phase
      round: number
    }
  | { type: 'CommitWindow' }
  | {
      type: 'CommitCard'
      /** Isabelle: shuffle the committed card into its owner's deck after the test. */
      shuffleAfter?: boolean
      investigator: InvestigatorId
      code: CardCode
      from?: 'discard' | 'deck'
      /** Explicit card-effect permission may exceed the ordinary helper allowance. */
      byEffect?: boolean
      toDeckBottom?: boolean
    }
  | { type: 'DiscardTopAndCommit'; investigator: InvestigatorId }
  | {
      type: 'RevealUntilCommittableSkill'
      investigator: InvestigatorId
      faction: string
      discardOthers?: boolean
    }
  | {
      type: 'ShuffleCardsIntoDeck'
      investigator: InvestigatorId
      cards: CardCode[]
      fromHand?: boolean
    }
  /**
   * Juega una carta de la mano pagando su coste (menos `discount`). `effect`
   * sustituye al efecto del evento (cuando depende del momento en que se juega).
   */
  | {
      type: 'PlayCard'
      discardedCost?: CardCode[]
      discardCostPaid?: boolean
      additionalActionsPaid?: boolean
      investigator: InvestigatorId
      code: CardCode
      /** Play the revealed top card of this investigator's deck (Montmartre). */
      fromDeck?: InvestigatorId
      originalOwner?: InvestigatorId
      discount?: number
      effect?: Message[]
      /** Messages between paying the card cost and resolving it (attacks of opportunity). */
      before?: Message[]
      /** Chosen value of a printed X cost (Jenny's Twin .45s). */
      x?: number
      /** Uses spent as resources toward the cost, by asset (Schoffner's Catalogue). */
      usesPayment?: Record<AssetId, number>
      /** Chosen zone when a copy is in hand and another playable from the discard pile. */
      from?: 'hand' | 'discard'
      /** A resolving card effect grants permission to play from this zone. */
      byEffect?: boolean
      /** Play without paying the resource cost (including cost modifiers). */
      noCost?: boolean
    }
  | {
      type: 'ResolvePlayedCard'
      discardedCost?: number
      investigator: InvestigatorId
      code: CardCode
      originalOwner?: InvestigatorId
      effect?: Message[]
      x?: number
      /** It was played from the discard pile (Winging It). */
      fromDiscard?: boolean
    }
  | {
      type: 'PutAssetIntoPlay'
      investigator: InvestigatorId
      code: CardCode
      originalOwner?: InvestigatorId
      noSlot?: boolean
      /** Played normally: open the after-play window for this exact instance. */
      played?: boolean
      /** Take the card from its controller's hand first ("put into play from your hand"). */
      fromHand?: boolean
      /** Fichas con las que entra (al tomar el control de un apoyo colocado). */
      tokens?: Partial<Pick<Asset, 'damage' | 'horror' | 'doom' | 'uses' | 'exhausted'>>
      /** Continue with the exact instance id under data.asset, even after entry reactions. */
      onEntered?: Extract<Message, { type: 'PlayerCardEffect' }>
    }
  // ----- Cartas de Historia en juego y apoyos colocados -----
  | { type: 'PutStoryIntoPlay'; code: CardCode; name: string }
  | { type: 'RemoveStory'; code: CardCode }
  | { type: 'PlaceCluesOnStory'; code: CardCode; investigator: InvestigatorId; amount: number }
  /** Apoyo sin dueño en una localización o vinculado a un enemigo (Invitados, Joya…). */
  | {
      type: 'PlaceAsset'
      code: CardCode
      name: string
      placement: AssetPlacement
      faceDown?: boolean
      exhausted?: boolean
      damage?: number
      horror?: number
      doom?: number
      uses?: number
      clues?: number
    }
  | { type: 'MovePlacedAsset'; placed: PlacedAssetId; placement: AssetPlacement }
  | {
      type: 'TakeControlOfPlaced'
      placed: PlacedAssetId
      investigator: InvestigatorId
      noSlot?: boolean
    }
  /** Un apoyo controlado deja de tener dueño y queda colocado (boca abajo si `faceDown`). */
  | { type: 'ReleaseAsset'; asset: AssetId; placement: AssetPlacement; faceDown?: boolean }
  | { type: 'FlipPlacedAsset'; placed: PlacedAssetId }
  | { type: 'RemovePlacedAsset'; placed: PlacedAssetId }
  | {
      type: 'DamagePlacedAsset'
      placed: PlacedAssetId
      damage: number
      horror: number
      deferDefeat?: boolean
    }
  /** Finaliza una asignación conjunta después de colocar ambos tipos de fichas. */
  | { type: 'FinalizeAssignedAssets'; dealt: DamageDealt[] }
  /** Pasa una carta del mazo de escenario a otra zona (lo resuelve el escenario). */
  | { type: 'ScenarioSpecific'; key: string; data?: Record<string, string | number | boolean> }
  | { type: 'SetScenarioMeta'; key: string; value: string | number }
  | { type: 'ConnectLocations'; a: LocationId; b: LocationId }
  /** `defeated`: it leaves play because it was defeated (Cherished Keepsake is exiled). */
  | { type: 'DiscardAsset'; asset: AssetId; defeated?: boolean }
  /** Cambia el velo de una localización hasta el final de la ronda. */
  | { type: 'ModifyShroud'; location: LocationId; amount: number }
  | {
      type: 'TurnShroudModifier'
      investigator: InvestigatorId
      location?: LocationId
      amount: number
    }
  | { type: 'ExhaustAsset'; asset: AssetId }
  | { type: 'ReadyAsset'; asset: AssetId }
  | { type: 'SpendUses'; asset: AssetId; amount: number }
  | { type: 'SetAssetForm'; asset: AssetId; form: string }
  | { type: 'ReplaceSkillTestResults'; then: Message[] }
  | { type: 'NextAssetFast'; investigator: InvestigatorId }
  | { type: 'RemoveCardFromDiscard'; investigator: InvestigatorId; code: CardCode }
  | { type: 'PlaceCluesOnAsset'; asset: AssetId; amount: number }
  | { type: 'MoveAssetCluesToEnemy'; asset: AssetId; enemy: EnemyId; amount: number }
  | {
      type: 'AssignDamage'
      killInstead?: boolean
      investigator: InvestigatorId
      damage: number
      horror: number
      assignFirst?: Partial<Record<'damage' | 'horror', string>>
      /** Enemigo cuyo ataque inflige el daño (Vagabundo dimensional). */
      enemy?: EnemyId
      /** Origen que se muestra: nombre de carta o `token:<ficha>`. */
      source?: string
      /** Lo ya asignado a apoyos, para la ventana de "tras infligirle daño u horror". */
      dealt?: DamageDealt[]
      assignmentAssets?: Asset[]
      /** Carta elegida que debe llenarse antes que otra (Bestia de Aldebarán). */
      focus?: AssetId | 'investigator'
    }
  | { type: 'DamageAsset'; asset: AssetId; damage: number; horror: number; deferDefeat?: boolean }
  | {
      type: 'AssignHorrorEvenly'
      investigator: InvestigatorId
      remaining: number
      assigned: Record<string, number>
      source?: string
    }
  /**
   * Revela una ficha; con `token`, resuelve esa ficha ya sacada (e ignora `ignored`).
   * `pending`: resolve the token held during its "when revealed" window. `fromBag`: the
   * investigator declined to resolve a sealed token instead (The Codex of Ages).
   */
  | {
      type: 'RevealChaosToken'
      token?: ChaosToken
      ignored?: ChaosToken
      pending?: boolean
      /** The held token's "after revealing" window was offered (Contingency). */
      afterWindow?: boolean
      fromBag?: boolean
    }
  /**
   * RR: a chaos token revealed outside a skill test by `investigator` (scenario effects,
   * Premonition). Premonition and The Codex of Ages may replace it, "when revealed" reactions
   * may cancel it or treat it as another symbol, and `then` resolves with `data.token` (what
   * it is treated as) and `data.physical`; the token stays in, or returns to, the bag.
   */
  | {
      type: 'RevealTokenOutsideTest'
      investigator: InvestigatorId
      then: Extract<Message, { type: 'ScenarioSpecific' | 'PlayerCardEffect' }>
      token?: ChaosToken
      pending?: boolean
      fromBag?: boolean
      /** Once-per-ability reactions already used on this reveal (Wendy Adams). */
      used?: string[]
    }
  /** Cancel the held token and return it to the bag (Wendy Adams), and reveal a new one. */
  | { type: 'CancelRevealedToken'; redraw?: boolean; use?: string }
  /** Return resolved tokens and reveal afresh, retaining commitments and per-test usage. */
  | { type: 'RedrawSkillTestTokens'; use: string }
  /** Cancel the held token and treat it as another symbol (Father Mateo). */
  | { type: 'TreatRevealedTokenAs'; token: ChaosToken }
  /** Discard the asset and resolve its sealed token as if revealed (The Codex of Ages). */
  | {
      type: 'ResolveSealedToken'
      asset: AssetId
      /** Outside a skill test, the reveal it replaces. */
      outside?: Extract<Message, { type: 'RevealTokenOutsideTest' }>
    }
  /** La próxima ficha se revela de dos en dos y se elige una (Mask of Silenus). */
  | { type: 'RevealExtraToken'; investigator: InvestigatorId }
  /** La prueba en curso tiene éxito por 0 (Scrape By). */
  | { type: 'ForceSkillTestSuccess' }
  /** La prueba en curso fracasa automáticamente (El juramento inconfesable, [elder_thing]). */
  | { type: 'ForceSkillTestFailure' }
  /** El ataque en curso inflige `amount` daño más (o menos), o ninguno con `none`. */
  | { type: 'AdjustAttackDamage'; amount?: number; none?: boolean }
  /** Cancela los efectos y los iconos de las cartas de habilidad comprometidas. */
  | { type: 'CancelCommittedSkills' }
  /** El enemigo no ataca en la fase de enemigos de esta ronda. */
  | { type: 'EnemySkipsAttacks'; enemy: EnemyId }
  /** Las demás cartas comprometidas vuelven a la mano de sus dueños (On the Brink). */
  | { type: 'ReturnCommittedToHand'; except: CardCode }
  /** Si en la prueba en curso se ha revelado alguna ficha con símbolo. */
  | { type: 'IfSymbolRevealed'; then: Message[] }
  /**
   * Condition on the current test: margin (negative when failed) and revealed tokens.
   * Every given condition must hold.
   */
  | {
      type: 'IfTestResult'
      atLeast?: number
      below?: number
      exactly?: number
      tokens?: ChaosToken[]
      then: Message[]
    }
  /** Durante la prueba en curso: `then` una vez por cada punto por el que se falla. */
  | { type: 'ForEachPointFailed'; then: Message[] }
  /** Si el enemigo ya no está en juego (lo ha derrotado el ataque). */
  | { type: 'IfEnemyDefeated'; enemy: EnemyId; then: Message[] }
  // ----- Smoke and Mirrors -----
  /**
   * RR "Mythos phase" 1.3: the agenda only advances at the doom check unless the card says
   * it can. `checkAgenda: true` is for those cards; the same applies to assets and investigators.
   */
  | { type: 'PlaceDoomOnEnemy'; enemy: EnemyId; amount: number; checkAgenda?: boolean }
  /** Pistas (pruebas) sobre un enemigo: recursos de la reserva como "pistas" del códex. */
  | { type: 'AddLead'; enemy: EnemyId }
  /** El enemigo sale del juego y queda debajo del acto. */
  | { type: 'PlaceUnderAct'; enemy: EnemyId }
  /** Roba la carta boca abajo de debajo de una localización. */
  | { type: 'DrawBeneath'; investigator: InvestigatorId; location: LocationId }
  /** Esquivo: tras atacar o ser atacado estando preparado, se aleja y se agota. */
  | { type: 'ElusiveRetreat'; enemy: EnemyId; exhaust?: boolean }
  /** Si el enemigo tiene al menos `atLeast` pistas del códex. */
  | {
      type: 'IfEnemyLeads'
      enemy: EnemyId
      atLeast: number
      then: Message[]
      otherwise?: Message[]
    }
  | { type: 'DiscardTopEncounter'; investigator?: InvestigatorId }
  /** Pistas de la reserva (no de una localización). */
  | { type: 'GainClues'; investigator: InvestigatorId; amount: number }
  /** Una carta de la zona de victoria pasa a estar debajo del acto. */
  | { type: 'VictoryToUnderAct'; code: CardCode; victory: number }
  /** El enemigo se mueve una vez hacia la localización; si se enfrenta, ataca. */
  | { type: 'HuntOnce'; enemy: EnemyId; toward: LocationId; attack?: boolean }
  | { type: 'AddUses'; asset: AssetId; amount: number }
  | { type: 'AttackIfEngaged'; enemy: EnemyId }
  // ----- Queen of Ash -----
  | { type: 'HealEnemy'; enemy: EnemyId; amount: number }
  | { type: 'ExhaustEnemy'; enemy: EnemyId }
  | { type: 'PlaceDoomOnAsset'; asset: AssetId; amount: number; checkAgenda?: boolean }
  | { type: 'SetDoomBecomesDamage' }
  /** El enemigo no atacará a este investigador durante el resto de la ronda. */
  | { type: 'SpareInvestigator'; enemy: EnemyId; investigator: InvestigatorId }
  /** No puede jugar ni comprometer cartas de este tipo durante el resto de la ronda. */
  | { type: 'BlockCardType'; investigator: InvestigatorId; cardType: string }
  /** Descarta de la mano las cartas (no debilidades) de un tipo: todas o una a elegir. */
  | {
      type: 'DiscardCardsOfType'
      investigator: InvestigatorId
      cardType: string
      all: boolean
      includeWeaknesses?: boolean
    }
  /** Muertos para la campaña (los que no se retiraron, con `exceptResigned`). */
  /** Con `investigator`, solo ese (Posesión: eliminado y muerto). */
  | { type: 'KillInvestigators'; exceptResigned?: boolean; investigator?: InvestigatorId }
  /** Los investigadores derrotados (no retirados) quedan enloquecidos para la campaña. */
  /** Los derrotados (no retirados) enloquecen; con `all`, todos (Surgen estrellas negras, R3). */
  | { type: 'DriveDefeatedInsane'; all?: boolean }
  | { type: 'DriveInvestigatorInsane'; investigator: InvestigatorId }
  | {
      type: 'ReduceEnemyAttackHorror'
      enemy: EnemyId
      investigator: InvestigatorId
      amount: number
    }
  /** Cambia la carta de un enemigo (otra cara), conservando daño y posición. */
  | { type: 'FlipEnemy'; enemy: EnemyId; card: EnemyCard }
  | { type: 'SetAct'; index: number }
  /** Descarta del mazo de encuentros hasta descartar un enemigo, y lo roba. */
  | { type: 'DiscardUntilEnemy'; investigator: InvestigatorId }
  /** Busca en el mazo y el descarte de encuentros un enemigo con el rasgo y lo roba. */
  | {
      type: 'SearchEncounterForTrait'
      investigator: InvestigatorId
      trait: string
      selected?: { zone: 'deck' | 'discard'; index: number }
    }
  | { type: 'LoseActions'; investigator: InvestigatorId; amount: number }
  /** +X skill value for the investigator's next skill test (The Red Clock). */
  | { type: 'NextTestBonus'; investigator: InvestigatorId; amount: number }
  /** One restricted additional action is lost (after the standard ones). */
  | {
      type: 'LoseAdditionalAction'
      investigator: InvestigatorId
      action: 'evade' | 'move' | 'trait' | 'engage'
    }
  /** Additional actions this turn, only during that investigator's turn (André Patel). */
  | { type: 'GainActions'; investigator: InvestigatorId; amount: number }
  /** Additional actions during that investigator's turn this round, now or when it begins. */
  | { type: 'GainTurnActionsThisRound'; investigator: InvestigatorId; amount: number }
  /** Exile a player card: from play (`asset`) or, otherwise, from its owner's discard pile. */
  | { type: 'ExileCard'; investigator: InvestigatorId; code: CardCode; asset?: AssetId }
  /** The current investigation discovers more clues, or adds success effects (Shed a Light). */
  | { type: 'AddInvestigationResults'; extraClues?: number; onSuccess?: Message[] }
  /** Granny Orne: the current test fails by this much more (or less, if negative). */
  | { type: 'ModifyFailBy'; amount: number }
  /** RR Automatic Success; before any token is revealed, steps 3 and 4 are skipped. */
  | { type: 'AutoSucceedSkillTest' }
  /** Will to Survive: no chaos tokens for their next skill test this turn. */
  | { type: 'SkipNextTestTokens'; investigator: InvestigatorId }
  | {
      type: 'TurnSkillEffect'
      investigator: InvestigatorId
      noTokens?: boolean
      bases?: Partial<Record<SkillType, number>>
      bonus?: { amount: number; code: CardCode; kinds?: SkillTestKind['type'][]; tags?: string[] }
    }
  /** Place an enemy in play on top (or at the bottom) of the encounter deck (Dumb Luck). */
  | { type: 'PutEnemyOnEncounterDeck'; enemy: EnemyId; bottom?: boolean }
  /** Attempt the last ended skill test again, without paying its costs (Live and Learn). */
  | { type: 'RepeatSkillTest'; investigator: InvestigatorId; modifier: number }
  /** Elige un enemigo de tu localización al resolverse y le hace daño. */
  | { type: 'ChooseEnemyToDamage'; investigator: InvestigatorId; amount: number }
  /** Cancela el ataque de este enemigo que se está resolviendo (Counterattack). */
  | { type: 'CancelEnemyAttack'; enemy: EnemyId }
  | { type: 'ProtectFromAttacks'; investigator: InvestigatorId; nonElite: boolean }
  | { type: 'AttackFromEncounterDiscard'; index: number; investigator: InvestigatorId }
  | { type: 'AttackWithoutLocation'; card: EnemyCard; investigator: InvestigatorId }
  | { type: 'EndAttackWithoutLocation'; enemy: EnemyId }
  | {
      type: 'ResolveEnemyAttack'
      modifier?: { damage: number; horror: number }
      enemy: EnemyId
      investigator: InvestigatorId
      exhaustAfter: boolean
    }
  /** Mira las `top` primeras de tu mazo, roba `picks` y el resto va al fondo (Unbridled Knowledge). */
  | {
      type: 'ChooseFromTop'
      investigator: InvestigatorId
      top: number
      picks: number
      arrange?: boolean
    }
  /** `windowResolved`: the "when you would succeed" reactions were offered (Extravagant Ring). */
  | { type: 'ResolveSkillTest'; windowResolved?: boolean; failWindowResolved?: boolean }
  /** The enemy disengages from each investigator (Pay Your Dues). */
  | { type: 'DisengageEnemy'; enemy: EnemyId }
  /** The enemy gains a keyword until the end of the round (Pay Your Dues: aloof). */
  | { type: 'EnemyGainsKeyword'; enemy: EnemyId; keyword: EnemyKeyword }
  /** Adds to (or, negative, takes from) the resources paid to commit a card ("Watch this!"). */
  | { type: 'CommitPayment'; code: CardCode; amount: number }
  | { type: 'EndSkillTest' }
  | { type: 'EngageEnemy'; enemy: EnemyId; investigator: InvestigatorId; windowResolved?: boolean }
  | { type: 'CheckEngagement'; location: LocationId; enemies?: EnemyId[] }
  | {
      type: 'EnemyAttack'
      opportunity?: boolean
      enemy: EnemyId
      investigator: InvestigatorId
      exhaustAfter: boolean
      evenIfExhausted?: boolean
    }
  /** Fase de enemigos: el investigador elige en qué orden le atacan los que quedan. */
  | { type: 'AttacksAgainst'; investigator: InvestigatorId; enemies: EnemyId[] }
  /** El jefe elige quién gasta la siguiente pista hasta reunir `amount` (acto, grupo). */
  | { type: 'PayGroupClues'; amount: number; from: InvestigatorId[] }
  | {
      type: 'DamageEnemy'
      checked?: boolean
      enemy: EnemyId
      amount: number
      by?: InvestigatorId
      /** Origen del daño, para las cartas que lo reducen (Espectro vengativo). */
      source?: DamageSource
      /** Simultaneous damage: defeat is checked later with CheckEnemyDefeat. */
      deferDefeat?: boolean
    }
  | { type: 'DefeatEnemy'; enemy: EnemyId; by?: InvestigatorId; withoutWindows?: boolean }
  | { type: 'DefeatAllEnemiesWithoutWindows'; by: InvestigatorId }
  | { type: 'EvadeEnemy'; enemy: EnemyId; by?: InvestigatorId }
  | { type: 'ReadyEnemy'; enemy: EnemyId }
  /** Con `enemies`, solo esos enemigos resuelven Cazador y Errante (Sr. Trombly). */
  | { type: 'HuntersMove'; enemies?: EnemyId[] }
  | { type: 'MoveHuntingEnemy'; enemy: EnemyId; windowResolved?: boolean }
  | { type: 'EnemiesAttack' }
  | { type: 'ReadyAll' }
  /** `direct`: solo puede asignarse a la carta de investigador. */
  | {
      type: 'TakeDamage'
      damageWindowResolved?: boolean
      killInstead?: boolean
      investigator: InvestigatorId
      damage: number
      horror: number
      direct?: boolean
      /** Divide this horror effect as evenly as possible among eligible cards. */
      evenly?: boolean
      assignFirst?: Partial<Record<'damage' | 'horror', string>>
      /** Enemigo cuyo ataque inflige el daño. */
      enemy?: EnemyId
      /** Origen que se muestra: nombre de carta o `token:<ficha>`; si falta, se deduce. */
      source?: string
      dealt?: DamageDealt[]
      /** Internal point of an allocation; notify only once for the whole effect. */
      assignmentPart?: boolean
      assignmentAssets?: Asset[]
    }
  | { type: 'CheckDefeat'; investigator: InvestigatorId; killInstead?: boolean }
  | {
      type: 'EliminateInvestigator'
      investigator: InvestigatorId
      weaknessesDone?: boolean
      assetsDone?: boolean
    }
  /**
   * Perdición en "el plan en curso". Con dos mazos de Plan (Surgen estrellas negras) el
   * jefe elige en cuál, salvo que se indique.
   */
  | { type: 'PlaceDoom'; amount: number; agenda?: AgendaDeck }
  /** `windowResolved`: the "agenda would advance" reactions were offered (Mystifying Song). */
  | { type: 'CheckAgenda'; windowResolved?: boolean }
  /** Avanza el plan en curso del segundo mazo de Plan. */
  | { type: 'AdvanceSecondAgenda' }
  | { type: 'SecondAgendaAdvanced'; from?: CardCode }
  | { type: 'AdvanceAgenda' }
  | { type: 'OfferActAdvance' }
  /** `paid`: las pistas ya se han pagado. */
  | { type: 'AdvanceAct'; paid?: boolean }
  | { type: 'SpendClues'; investigator: InvestigatorId; amount: number }
  | { type: 'MoveControlledClues'; investigator: InvestigatorId; to: ClueHolder; amount: number }
  /** `ifEnemy`: resolved first when the card actually drawn is an enemy (Unaware). */
  | { type: 'DrawEncounterCard'; investigator: InvestigatorId; ifEnemy?: Message[] }
  | {
      type: 'ResolveEncounterCard'
      investigator: InvestigatorId
      card: EncounterCard
      exhaustAfterDraw?: boolean
    }
  | { type: 'DrawFromEncounterDiscard'; investigator: InvestigatorId; code: CardCode }
  | {
      type: 'SpawnEnemy'
      initialDamage?: number
      card: EnemyCard
      location: LocationId
      engageWith: InvestigatorId | null
      owner?: InvestigatorId
      exhaustAfterSpawn?: boolean
      windowResolved?: boolean
      after?: Message[]
    }
  | { type: 'RevealTreachery'; treachery: TreacheryId; investigator: InvestigatorId }
  | { type: 'AfterRevelation'; treachery: TreacheryId; investigator: InvestigatorId }
  | { type: 'GainSurge' }
  | {
      type: 'PlaceTreachery'
      treachery: TreacheryId
      placement: TreacheryPlacement
      /** Oculto: va en secreto a la mano del investigador de la zona de amenaza. */
      hidden?: boolean
    }
  /** `own`: lo hace la propia carta (lo único que descarta una carta Oculta). */
  | { type: 'DiscardTreachery'; treachery: TreacheryId; own?: boolean }
  | {
      type: 'DiscardRandomFromHand'
      investigator: InvestigatorId
      amount: number
      nonWeaknessOnly?: boolean
    }
  | { type: 'LoseResources'; investigator: InvestigatorId; amount: number }
  /** El investigador deja pistas suyas en su localización. */
  | { type: 'PlaceCluesOnLocation'; investigator: InvestigatorId; amount: number }
  | { type: 'Forced'; trigger: Trigger }
  | {
      type: 'UseAbility'
      actionKind?: ActionName
      investigator: InvestigatorId
      key: string
      actions: number
      provokes: boolean
      limit?: AbilityLimit
      costs?: Message[]
      playFromDiscard?: { code: CardCode; discount: number }
      /** A Parley action: parley costs apply and `afterParley` reactions follow. */
      parley?: boolean
      then: Message[]
    }
  | { type: 'CheckActObjective' }
  | { type: 'Log'; key: string; params?: LabelParams }
  /** `from`: plan que avanzó; si su reverso cambió el mazo, no se pasa a la siguiente. */
  | { type: 'AgendaAdvanced'; from?: CardCode }
  | { type: 'ActAdvanced' }
  | { type: 'DiscardEnemy'; enemy: EnemyId }
  | { type: 'MoveEnemy'; enemy: EnemyId; location: LocationId }
  | { type: 'PutLocationIntoPlay'; location: LocationId; investigator?: InvestigatorId }
  | {
      type: 'PutEncounterLocation'
      card: EncounterLocationCard
      investigator: InvestigatorId
      drawn?: boolean
      moveAfter?: boolean
      resolveRevelation?: boolean
    }
  | {
      type: 'RemoveLocation'
      location: LocationId
      checked?: boolean
      shuffleIntoEncounter?: boolean
    }
  | { type: 'PlaceCluesOnLocationFromPool'; location: LocationId; amount: number }
  | { type: 'SpawnSetAsideEnemy'; code: CardCode; location: LocationId }
  /**
   * Saca un enemigo del juego (curado) y lo vuelve a apartar. Con `card` también lo
   * recupera de la zona de victoria, donde solo queda su código.
   */
  | { type: 'SetAsideEnemy'; code: CardCode; card?: EnemyCard }
  | { type: 'PlaceSetAsideTreachery'; code: CardCode; placement: TreacheryPlacement }
  /** Mueve copias apartadas al descarte de encuentros (todas, o `count`). */
  | { type: 'MoveSetAsideToEncounterDiscard'; code: CardCode; count?: number }
  /** Baraja en el mazo de encuentros las cartas apartadas con estos códigos. */
  | { type: 'ShuffleSetAsideIntoEncounter'; codes: CardCode[] }
  /** Every card in the investigator's discard pile is removed from the game (Abandoned and Alone). */
  | { type: 'RemoveDiscardFromGame'; investigator: InvestigatorId }
  /** The card is removed from the game from its owner's discard pile (Mystifying Song). */
  | { type: 'RemoveFromDiscard'; investigator: InvestigatorId; code: CardCode }
  /** Until the end of the phase, the agenda cannot advance by its doom threshold (Mystifying Song). */
  | { type: 'HoldAgenda' }
  /** Descarta las primeras cartas del mazo de un investigador. */
  | {
      type: 'MillDeck'
      investigator: InvestigatorId
      amount: number
      ifDiscarded?: { code: CardCode; then: Message[] }
    }
  /** Return a controlled asset to its original owner's deck and shuffle. */
  | { type: 'ShuffleAssetIntoDeck'; asset: AssetId }
  /** Gastar pistas "como grupo" (de cualquier investigador). */
  | { type: 'SpendGroupClues'; amount: number }
  /** El investigador elige y descarta cartas de su mano. */
  | { type: 'ChooseDiscardFromHand'; investigator: InvestigatorId; amount: number }
  /** Busca en el mazo y el descarte de encuentros y roba hasta `amount` copias. */
  /** `fromDiscard`: busca solo en la pila de descartes de encuentros. */
  | {
      type: 'SearchAndDrawEncounter'
      investigator: InvestigatorId
      code: CardCode
      amount: number
      fromDiscard?: boolean
    }
  | { type: 'Heal'; investigator: InvestigatorId; damage: number; horror: number }
  | { type: 'Resign'; investigator: InvestigatorId }
  | { type: 'DefeatInvestigator'; investigator: InvestigatorId }
  /** Fin del escenario. `told`: los textos de resolución ya se mostraron. */
  | {
      type: 'EndScenario'
      outcome: ScenarioOutcome
      told?: boolean
      /** Ya se aplicaron los efectos de "cuando termine la partida" de las debilidades. */
      weaknessesDone?: boolean
    }
  /** Texto de historia para leer; el investigador jefe lo cierra o elige una opción. */
  | { type: 'Story'; entry: StoryEntry; choices?: Choice[] }
  // ----- Registro de campaña -----
  | { type: 'RecordNote'; note: string; value?: string }
  | { type: 'CrossOutNote'; note: string }
  /** Cada investigador (o solo uno) gana experiencia; con `victory`, más la zona de victoria. */
  | { type: 'EarnExperience'; amount: number; victory?: boolean; investigator?: InvestigatorId }
  /** Trauma para cada investigador (o solo uno). */
  | {
      type: 'SufferTrauma'
      physical?: number
      mental?: number
      investigator?: InvestigatorId
    }
  | { type: 'AddStoryAsset'; investigator: InvestigatorId; code: CardCode }
  /** `scenarioOnly`: solo para este escenario, sin anotarlas en el registro de campaña. */
  | { type: 'AddChaosTokens'; tokens: ChaosToken[]; scenarioOnly?: boolean }
  /** Coloca (o retira, con valores negativos) horror y perdición en una localización. */
  | { type: 'PlaceLocationTokens'; location: LocationId; horror?: number; doom?: number }
  | { type: 'EarnReward'; code: CardCode }
  | { type: 'Ask'; investigator: InvestigatorId; question: Question }
  // ----- Cartas de jugador -----
  /** Ventana de reacciones a `trigger` (una por investigador, hasta que pasen). */
  | { type: 'Reactions'; trigger: Trigger; used?: string[]; passed?: InvestigatorId[] }
  | { type: 'SpendResources'; investigator: InvestigatorId; amount: number }
  /** +N al valor de la prueba en curso. */
  | { type: 'BoostSkillTest'; amount: number }
  /** Additive difficulty reduction of the current test, before factors (Flashlight 3). */
  | { type: 'ReduceSkillTestDifficulty'; amount: number }
  | { type: 'CommitFromDiscard'; investigator: InvestigatorId; code: CardCode }
  /** Ventana tras revelar fichas para comprometer cartas que lo permiten. */
  | { type: 'AfterRevealWindow' }
  | { type: 'CancelRevelation'; treachery: TreacheryId }
  | {
      type: 'PlaceDoomOnInvestigator'
      investigator: InvestigatorId
      amount: number
      checkAgenda?: boolean
    }
  | { type: 'BeginAssetAbility'; asset: AssetId }
  | { type: 'EndAssetAbility'; asset: AssetId }
  | {
      type: 'AttachEventToAsset'
      asset: AssetId
      investigator: InvestigatorId
      code: CardCode
      trait: string
      /** Host controlled by any investigator at the player's location. */
      atLocation?: boolean
      /** Limit 1 copy of this title per asset. */
      limitPerAsset?: boolean
    }
  /** The asset leaves play without going to a discard pile. */
  | { type: 'RemoveAssetFromGame'; asset: AssetId; leavingResolved?: boolean }
  | { type: 'ExhaustUpgrade'; asset: AssetId; index: number }
  /** The attached event goes to its owner's discard pile. */
  | { type: 'DiscardUpgrade'; asset: AssetId; index: number }
  | { type: 'PrimeNextFight'; asset: AssetId; amount: number }
  | { type: 'ClearNextFight'; asset: AssetId }
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
      /** Restrict a trait search to a printed card type (Establish Motive). */
      cardType?: PlayerCardDef['type']
      top?: number
      traits: string[]
      to: 'hand' | 'play'
      discount?: number
      /** Cualquier carta, no solo apoyos con esos rasgos (Mysterious Grimoire). */
      anyCard?: boolean
      /** Allow weaknesses as choices in an unrestricted card search. */
      includeWeaknesses?: boolean
      /** Match the traits across card types, rather than assets only. */
      anyType?: boolean
      /** A search may fail to find a card even when a match exists. */
      optional?: boolean
      /** The chosen card is drawn, rather than merely added to the hand. */
      drawFound?: boolean
      /** Las debilidades buscadas también se roban. */
      drawWeaknesses?: boolean
      /** Si no se encuentra nada, roba estas cartas (Ye Olde Magick Shoppe). */
      orDraw?: number
    }
  | {
      type: 'TakeFromDeck'
      investigator: InvestigatorId
      code: CardCode
      to: 'hand' | 'play'
      drawFound?: boolean
      discount?: number
    }
  | { type: 'ShuffleDeck'; investigator: InvestigatorId }
  /** Busca en las primeras cartas del mazo de encuentros un enemigo no Élite y lo roba. */
  | { type: 'SearchEncounterForEnemy'; investigator: InvestigatorId; top: number }
  | { type: 'DisengageAll'; investigator: InvestigatorId }
  /** El investigador elige una localización conectada a la que moverse. */
  /** `then`: resolved after moving, not when skipping (The Red Clock: move up to 3 times). */
  | {
      type: 'ChooseMove'
      investigator: InvestigatorId
      /** Omit the skip option when the card requires movement. */
      mandatory?: boolean
      revealedOnly?: boolean
      range?: number
      then?: Message[]
    }
  | { type: 'AtEndOfTurn'; investigator: InvestigatorId; then: Message[] }
  /**
   * Premonition: sella una ficha al azar de la bolsa. With `token` and `holder`, search the bag
   * for that token and seal it on a card in play (The Codex of Ages, Serpents of Yig).
   */
  | {
      type: 'SealToken'
      investigator: InvestigatorId
      code: CardCode
      token?: ChaosToken
      /** Preferred bag position of `token` (the one just revealed). */
      index?: number
      holder?: SealHolder
    }
  | { type: 'AddTreacheryTokens'; treachery: TreacheryId; amount: number; discardAt?: number }
  /** Saca una debilidad del juego y la baraja en el mazo de su dueño (o de `investigator`). */
  | { type: 'ShuffleTreacheryIntoDeck'; treachery: TreacheryId; investigator?: InvestigatorId }
  /** Una debilidad robada del mazo se resuelve. */
  | { type: 'ResolveWeakness'; investigator: InvestigatorId; code: CardCode }
  /** El investigador coloca una a una las cartas miradas arriba o abajo de su mazo. */
  | { type: 'ArrangeCards'; investigator: InvestigatorId; cards: CardCode[] }
  | { type: 'PlaceOnDeck'; investigator: InvestigatorId; code: CardCode; where: 'top' | 'bottom' }
  | {
      type: 'MoveDamage'
      from: DamageHolder
      to: DamageHolder
      kind: 'damage' | 'horror'
      by?: InvestigatorId
    }
  /** El investigador elige uno de sus apoyos con ese rasgo y vuelve a su mano. */
  | { type: 'ReturnAssetWithTrait'; investigator: InvestigatorId; trait: string }
  /** Slippery: el enemigo no se prepara en la próxima fase de mantenimiento. */
  | { type: 'EnemyStaysExhausted'; enemy: EnemyId }
  // ----- Asesinato en el hotel Excelsior -----
  /** Mueve pistas entre cartas (o desde/hacia la reserva de fichas). */
  | { type: 'MoveClues'; from: ClueHolder; to: ClueHolder; amount: number }
  /** Retira perdición del plan, de un enemigo, de un apoyo o de un investigador. */
  | {
      type: 'RemoveDoom'
      target:
        | { type: 'agenda'; deck?: AgendaDeck }
        | { type: 'enemy'; id: EnemyId }
        | { type: 'asset'; id: AssetId }
        | { type: 'investigator'; id: InvestigatorId }
      amount: number
    }
  /** "Retira toda la perdición del juego." */
  | { type: 'RemoveAllDoom' }
  /** Derrota al enemigo si ya tiene tanto daño como salud (al perder una vinculada). */
  | { type: 'CheckEnemyDefeat'; enemy: EnemyId; by?: InvestigatorId }
  /** RR "Equipment Slots": discard assets until the remaining ones fit their slots. */
  | { type: 'CheckSlots'; investigator: InvestigatorId }
  /** Colocación inicial: el jefe en `lead` y los demás en `others`. */
  | { type: 'PlaceAtStart'; lead: LocationId; others: LocationId }
  /** El enemigo abandona el juego y va a la zona de victoria (sin ser derrotado). */
  | { type: 'EnemyToVictory'; enemy: EnemyId }
  /** El enemigo se retira de la partida (no va a ninguna pila). */
  | { type: 'RemoveEnemyFromGame'; enemy: EnemyId; leavingResolved?: boolean }

/** Una carta que puede tener daño u horror. */
export type DamageHolder =
  | { type: 'investigator'; id: InvestigatorId }
  | { type: 'asset'; id: AssetId }
  | { type: 'enemy'; id: EnemyId }

/** Daño u horror asignado a un apoyo durante una misma asignación. */
export interface DamageDealt {
  investigator?: InvestigatorId
  asset?: AssetId
  placed?: PlacedAssetId
  damage: number
  horror: number
}

/** De dónde viene el daño a un enemigo. */
export interface DamageSource {
  code?: CardCode
  /** Daño de un ataque (prueba de combate). */
  attack?: boolean
  /** Rasgos de la carta que lo inflige ("Spell", "Relic"…). */
  traits?: string[]
  /** Lo inflige una carta de Encuentro. */
  encounter?: boolean
}

/** Cartas que pueden tener pistas (`pool` es la reserva de fichas). */
export type ClueHolder =
  | { type: 'investigator'; id: InvestigatorId }
  | { type: 'asset'; id: AssetId }
  | { type: 'location'; id: LocationId }
  | { type: 'enemy'; id: EnemyId }
  | { type: 'treachery'; id: TreacheryId }
  | { type: 'placed'; id: PlacedAssetId }
  /** Pistas sobre el mazo de Acto (Descubriendo la verdad). */
  | { type: 'act' }
  | { type: 'pool' }

/** Momentos en los que se comprueban las habilidades forzadas. */
export type Trigger =
  | { type: 'gameBegins'; openingHands: Record<InvestigatorId, CardCode[]> }
  | {
      type: 'beforeEnemyDamage'
      enemy: EnemyId
      investigator: InvestigatorId
      amount: number
      source?: DamageSource
    }
  | {
      type: 'whenDealtDamage'
      investigator: InvestigatorId
      damage: number
      horror: number
      enemy?: EnemyId
    }
  | { type: 'afterCardsDrawn'; investigator: InvestigatorId; amount: number }
  | {
      type: 'afterRevealLocation' | 'afterPutLocation'
      investigator?: InvestigatorId
      location: LocationId
    }
  | { type: 'roundBegins' }
  | { type: 'mythosPhaseBegins' }
  | { type: 'afterHunterMove'; enemy: EnemyId }
  | { type: 'agendaAdvances'; code?: CardCode }
  | { type: 'afterGainClues'; investigator: InvestigatorId; amount: number }
  | { type: 'encounterCardDiscarded'; card: EncounterCard; investigator?: InvestigatorId }
  | { type: 'beforeEnemySpawns'; location: LocationId; card: EnemyCard }
  | { type: 'afterRevealChaosToken'; investigator: InvestigatorId; token: ChaosToken }
  /** Before the revealed token resolves; `state.skillTest.revealing` holds it. */
  | { type: 'whenRevealChaosToken'; investigator: InvestigatorId; token: ChaosToken }
  /** ST.3 ends: "after revealing chaos tokens", the token still held (Contingency). */
  | { type: 'afterRevealingChaosToken'; investigator: InvestigatorId; token: ChaosToken }
  | {
      type: 'afterDiscoverClues'
      investigator: InvestigatorId
      location: LocationId
      amount?: number
      /** No quedan pistas en la localización. */
      last?: boolean
    }
  /** Tras comprometer cartas a una prueba (`by` las compromete, `tester` hace la prueba). */
  | { type: 'afterCommit'; by: InvestigatorId; tester: InvestigatorId }
  /** Tras ganar recursos por el efecto de una carta. */
  | { type: 'afterGainResources'; investigator: InvestigatorId; amount: number }
  | { type: 'investigationPhaseEnds' }
  /** Al final de la fase de Mitos (Buscador de Carcosa, Mago de la Orden). */
  | { type: 'mythosPhaseEnds' }
  | { type: 'enemyDefeated'; enemy: Enemy; by?: InvestigatorId }
  | { type: 'afterEnemyPhaseAttack'; enemy: EnemyId; investigator: InvestigatorId }
  | { type: 'afterDoomPlaced'; agenda?: AgendaDeck }
  /** ST.6: the investigator would succeed at the current skill test (Extravagant Ring). */
  | { type: 'whenWouldSucceed'; investigator: InvestigatorId }
  /** ST.1: after an investigator initiates a skill test (Called by the Mists). */
  | { type: 'afterSkillTestInitiated'; investigator: InvestigatorId }
  /** ST.6: the test would fail (Granny Orne, Lucky!); its value may still change. */
  | { type: 'whenWouldFail'; investigator: InvestigatorId }
  /** The current agenda would advance by reaching its doom threshold. */
  | { type: 'agendaWouldAdvance' }
  | {
      type: 'afterEnemyAttack'
      enemy: EnemyId
      investigator: InvestigatorId
      location?: LocationId
    }
  /** Un enemigo va a atacar (antes de resolver el ataque). */
  | {
      type: 'whenEnemyAttacks'
      enemy: EnemyId
      investigator: InvestigatorId
      opportunity?: boolean
    }
  /**
   * `afterSkillTest`: ya se sabe si la prueba tiene éxito, antes de aplicar sus
   * resultados (paso 6: "después de tener éxito / fallar"). `skillTestEnded`: la
   * prueba ha terminado (paso 8: "después de esta prueba").
   */
  | {
      type: 'afterSkillTest' | 'skillTestEnded'
      investigator: InvestigatorId
      kind: SkillTestKind['type']
      succeeded: boolean
      /** Valor final menos dificultad (negativo si falla). */
      margin: number
      enemy?: EnemyId
      location?: LocationId
      source?: AssetId
    }
  | { type: 'afterPlayAsset'; investigator: InvestigatorId; code: CardCode; asset?: AssetId }
  /** Se ha jugado una carta (pagado su coste), de cualquier tipo (Acordes tortuosos). */
  | { type: 'afterPlayCard'; investigator: InvestigatorId; code: CardCode }
  | { type: 'afterActionAbility'; investigator: InvestigatorId; code: CardCode }
  | { type: 'afterAssetEntersPlay'; investigator: InvestigatorId; asset: AssetId }
  | { type: 'afterDrawCard'; investigator: InvestigatorId; card: CardCode }
  /** The last card left the investigator's deck, before any later reshuffle. */
  | { type: 'deckEmptied'; investigator: InvestigatorId }
  | { type: 'enemyEntersLocation'; enemy: EnemyId; location: LocationId }
  | { type: 'whenTreacheryDrawn'; investigator: InvestigatorId; treachery: TreacheryId }
  | { type: 'afterCancelRevelation'; card: CardCode; weakness: boolean }
  | { type: 'afterEvade'; investigator: InvestigatorId; enemy: EnemyId }
  | {
      type: 'afterTakeDamage'
      investigator: InvestigatorId
      damage: number
      horror: number
      /** Enemigo cuyo ataque lo ha infligido. */
      enemy?: EnemyId
    }
  | { type: 'afterAssetDamaged'; asset: AssetId; damage: number; horror: number }
  /** Al terminar de asignar daño y horror: lo que ha recibido cada apoyo (con o sin dueño). */
  | {
      type: 'afterDamageAssigned'
      investigator: InvestigatorId
      dealt: DamageDealt[]
      assignmentAssets?: Asset[]
      /** Attacking enemy, when the damage comes from an enemy attack (Guard Dog). */
      enemy?: EnemyId
    }
  /** Un investigador ha sido derrotado (no cuenta retirarse). */
  | { type: 'investigatorDefeated'; investigator: InvestigatorId }
  | { type: 'enemyPhaseBegins' }
  /** Un enemigo acaba de entrar en juego (tras enfrentarse, si le toca). */
  | { type: 'enemySpawned'; enemy: EnemyId; location: LocationId }
  | { type: 'afterTakeControlOfPlaced'; investigator: InvestigatorId; code: CardCode }
  | { type: 'assetDefeated'; asset: Asset }
  | { type: 'locationCluesRemoved'; location: LocationId }
  | { type: 'afterEngage'; investigator: InvestigatorId; enemy: EnemyId }
  | { type: 'beforeEngage'; investigator: InvestigatorId; enemy: EnemyId }
  | { type: 'enemyWouldPatrol'; enemy: EnemyId }
  | { type: 'enemyWouldEnterLocation'; enemy: EnemyId; location: LocationId }
  | { type: 'enemyDisengaged'; enemy: EnemyId; investigator: InvestigatorId }
  | { type: 'turnBegins'; investigator: InvestigatorId }
  | { type: 'turnEnds'; investigator: InvestigatorId }
  | { type: 'roundEnds' }
  | { type: 'enemyPhaseEnds' }
  | { type: 'afterSpendResources'; investigator: InvestigatorId; amount: number }
  | {
      type: 'afterMove'
      investigator: InvestigatorId
      first: boolean
      from?: LocationId | null
      /** El movimiento fue una acción de movimiento. */
      moveAction?: boolean
      encounterEffect?: boolean
    }
  | { type: 'whenEnterLocation'; investigator: InvestigatorId; location: LocationId }
  | { type: 'beforeMoveEngagement'; investigator: InvestigatorId }
  | {
      type: 'afterDealDamage'
      investigator: InvestigatorId
      enemy: EnemyId
      /** El daño procede de un ataque (prueba de combate). */
      attack?: boolean
    }
  /** Un enemigo ha recibido daño (de cualquier origen). */
  | {
      type: 'afterEnemyDamaged'
      enemy: EnemyId
      amount: number
      by?: InvestigatorId
      excess?: number
    }
  /** Después de realizar una acción de negociar (Salón de baile, Sala de estar). */
  | { type: 'afterParley'; investigator: InvestigatorId; location: LocationId | null }

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
  | { type: 'story'; id: string }
  | { type: 'placed'; id: PlacedAssetId }

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
  /** Decisions printed in an introduction, resolved before investigator setup. */
  choices?: Choice[]
}

export interface Question {
  kind: 'chooseOne'
  /** La pregunta es un texto de historia (la mesa lo muestra en una ventana). */
  story?: StoryEntry
  /** Preguntar aunque solo haya una opción (pausas para que el jugador vea el estado). */
  alwaysAsk?: boolean
  /** Es el mulligan de la mano inicial (la mesa lo muestra sobre la mano). */
  mulligan?: boolean
  /** Clave i18n del enunciado. */
  prompt: string
  promptParams?: LabelParams
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

/** Lo que cada investigador lleva de un escenario a otro (registro de campaña). */
export interface InvestigatorRecord {
  /** Experiencia sin gastar. */
  xp: number
  physicalTrauma: number
  mentalTrauma: number
  /** Muerto o enloquecido: no puede seguir en la campaña. */
  killed?: boolean
  insane?: boolean
  /** Apoyos de historia ganados (se añaden al mazo sin contar para su tamaño). */
  storyAssets: CardCode[]
}

/** Registro de campaña (guía de campaña, página 15). */
export interface CampaignLog {
  /** Cards permanently removed from every investigator's deck by campaign effects. */
  removedCards?: CardCode[]
  /** Notas de campaña, por clave ("universityBurned"…). */
  notes: string[]
  /** Notas tachadas: se ignoran el resto de la campaña. */
  crossedOut: string[]
  /** Valores con nombre ("harbinger" → nombre del personaje). */
  values: Record<string, string>
  /** Fichas añadidas a la bolsa del caos durante la campaña. */
  chaosTokens: ChaosToken[]
  investigators: Record<InvestigatorId, InvestigatorRecord>
  /** Cartas de recompensa ganadas (se pueden incluir al crear mazos nuevos). */
  rewards?: CardCode[]
}

export type ScenarioOutcome = { type: 'resolution'; resolution: number } | { type: 'noResolution' }

export interface ExperienceGain {
  investigator: InvestigatorId
  bonus: number
  victory: number
  amount: number
}

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------

/**
 * An asset's additional actions this turn. `inactive`: its condition stopped holding (The Black
 * Fan under 15 resources); the remaining actions return if it holds again, but never twice.
 */
export interface TurnActionGrant {
  asset: AssetId
  remaining: number
  inactive?: boolean
}

export interface GameState {
  defeatedEnemyHealthThisTurn?: Record<InvestigatorId, number>
  /** Versión del motor que creó la partida, para migraciones futuras. */
  boons?: Boon[]
  athenaUsed?: InvestigatorId[]
  engineVersion: number
  scenarioId: string
  scenarioRulesVersion?: number
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
  /** Paso de la fase en curso (para la mesa). */
  phaseStep?: PhaseStep
  /** Orden de jugadores establecido durante la preparación. */
  investigators: Investigator[]
  /** Jefe elegido tras una eliminación; sin este campo, el primero en orden. */
  leadInvestigatorId?: InvestigatorId
  /** Nuevas partidas eligen jefe tras eliminarlo; las guardadas sin versión conservan su historial. */
  leadElectionVersion?: 1
  /** Investigadores que empezaron el escenario (para valores "por investigador"). */
  startingInvestigatorCount: number
  locations: Record<LocationId, Location>
  enemies: Record<EnemyId, Enemy>
  /** Attack sources represented outside the location map (discard pile or scenario card). */
  attackSourcesWithoutLocation?: Record<EnemyId, Enemy>
  agendas: Agenda[]
  agendaIndex: number
  doom: number
  /** Segundo mazo de Plan en juego a la vez (Surgen estrellas negras). */
  secondAgenda?: SecondAgendaDeck | null
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
  /** Cartas de enemigo puestas debajo del acto (sospechosos interrogados). */
  underAct?: CardCode[]
  /** Suma de los valores de victoria de las cartas de la zona de victoria. */
  victoryPoints?: number
  /** Registro de campaña: llega del escenario anterior y los efectos de historia lo cambian. */
  campaignLog?: CampaignLog
  /** Breakdown of experience effects, including penalties, for the campaign journal. */
  experience?: ExperienceGain[]
  /** Localizaciones apartadas que los efectos del escenario pueden poner en juego. */
  setAsideLocations: Record<LocationId, LocationCard>
  abilityUses: AbilityUse[]
  /** Investigador cuyo turno está en curso. */
  activeTurn?: InvestigatorId | null
  /** Remaining continuous bonus actions, tracked by physical asset instance. */
  turnActionGrants?: TurnActionGrant[]
  /** Saved turn context while taking an action as if it were another investigator's turn. */
  immediateActions?: {
    investigator: InvestigatorId
    activeTurn: InvestigatorId | null
    /** The action is inside this investigator's actual turn, not a temporary context. */
    ownTurn?: boolean
    /** Set on the outermost frame when the actual turn ends during an action. */
    endedTurn?: boolean
    actionsRemaining: number
    actionsTaken?: number
    movedThisTurn?: boolean
    extraMove?: boolean
    extraEvade?: boolean
    turnActionGrants?: TurnActionGrant[]
  }[]
  dilemmasResolved?: { round: number; count: number }
  /** Ataques de enemigos (para "si este enemigo te ha atacado esta ronda"). */
  enemyAttacks?: { enemy: EnemyId; investigator: InvestigatorId; round: number }[]
  /** La perdición que se colocaría pasa a ser 1 daño directo a cada investigador. */
  doomBecomesDamage?: boolean
  /** A chaos token revealed outside a skill test, held during its "when revealed" window. */
  tokenReveal?: {
    investigator: InvestigatorId
    token: ChaosToken
    face: ChaosToken
    /** Its position in the bag, to put it back where it was. */
    index: number
    then: Extract<Message, { type: 'ScenarioSpecific' | 'PlayerCardEffect' }>
    used: string[]
  }
  /** The last skill test that ended, for effects played after it ends (Live and Learn). */
  lastSkillTest?: {
    origin: Extract<Message, { type: 'BeginSkillTest' }>
    investigator: InvestigatorId
    succeeded: boolean
  }
  /** Exiled player cards: removed from the game and from their owner's campaign deck. */
  exiled?: { investigator: InvestigatorId; code: CardCode }[]
  /** Mystifying Song: the agenda cannot advance by its doom threshold during this phase. */
  agendaHeld?: { phase: Phase; round: number }
  /** Ataque cancelado que aún no se ha resuelto. */
  canceledAttack?: EnemyId | null
  /** Efectos pendientes "al final de tu turno". */
  endOfTurn?: { investigator: InvestigatorId; then: Message[] }[]
  /**
   * Fichas selladas sobre cartas. Without `holder` (Premonition) the next reveal resolves it;
   * with one, it stays on that card and returns to the bag when the card leaves play.
   */
  sealed?: {
    token: ChaosToken
    investigator: InvestigatorId
    code: CardCode
    holder?: SealHolder
  }[]
  assets: Record<AssetId, Asset>
  /** Nested triggered abilities currently resolving, outermost first. */
  resolvingAssets?: AssetId[]
  /** Apoyos sin dueño (Invitados en localizaciones, reliquias vinculadas a enemigos). */
  placedAssets?: Record<PlacedAssetId, PlacedAsset>
  /** Cartas de Historia en juego, por código. */
  stories?: Record<CardCode, StoryCardInPlay>
  /** Mazos propios del escenario (p. ej. el mazo de Invitados), por nombre. */
  scenarioDecks?: Record<string, CardCode[]>
  /** Datos del escenario (facción aliada, puntuación…). */
  scenarioMeta?: Record<string, string | number>
  /** Pistas colocadas sobre el mazo de Acto. */
  actClues?: number
  log: LogEntry[]
  skillTest: SkillTest | null
  /** Pila de mensajes pendientes: el primero es el siguiente en procesarse. */
  queue: Message[]
  pending: PendingQuestion | null
  outcome: ScenarioOutcome | null
}
