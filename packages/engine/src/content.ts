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
  Action,
  Agenda,
  Asset,
  CardCode,
  Choice,
  ChaosSymbol,
  ChaosToken,
  DamageSource,
  Enemy,
  EnemyCard,
  EnemyKeyword,
  GameState,
  Investigator,
  InvestigatorId,
  Location,
  LocationId,
  Message,
  PlacedAsset,
  PlayerCardDef,
  StoryCardInPlay,
  ReactionOption,
  ScenarioOutcome,
  SkillTest,
  SkillType,
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
  /** Incompatible deterministic rule changes are versioned per scenario. */
  rulesVersion?: number
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
  /** Mensajes propios del escenario (`ScenarioSpecific`): devuelve el estado nuevo. */
  specific?: (
    state: GameState,
    key: string,
    data: Record<string, string | number | boolean>,
  ) => GameState
  /**
   * Un apoyo controlado va a abandonar el juego (descartado o derrotado). Si devuelve
   * mensajes, se resuelven en su lugar (Invitados que quedan hechizados).
   */
  assetLeavesPlay?: (
    state: GameState,
    asset: Asset,
    /** Por qué: descartado, o su dueño ha sido derrotado o se ha retirado. */
    reason: 'discard' | 'defeated' | 'resigned',
  ) => Message[] | null
  /** Habilidades del escenario para cualquier investigador (tarjeta de escenario). */
  abilities?: AbilitiesFn<null>
  /** Modificador a la prueba en curso por efectos del escenario (traiciones, enemigos, lugares). */
  skillModifier?: (state: GameState, test: SkillTest) => number
  /** El enemigo no puede recibir daño. */
  enemyImmune?: (state: GameState, enemy: Enemy) => boolean
  /**
   * Al ir a ser derrotado un enemigo: mensajes que se resuelven en su lugar (si devuelve
   * una lista, aunque esté vacía, no se derrota). Penumbrosa Carcosa: Hastur.
   */
  enemyWouldBeDefeated?: (state: GameState, enemy: Enemy) => Message[] | null
  /** Los investigadores no son derrotados por el horror (Penumbrosa Carcosa). */
  noHorrorDefeat?: boolean
  /** No puede jugar esta carta (Llanuras inhóspitas, Profundidades de Demhe). */
  cannotPlay?: (state: GameState, investigator: InvestigatorId, code: CardCode) => boolean
  /** Sustituye el efecto de cualquier ficha revelada (Hastur: fallo automático). */
  tokenOverride?: (
    state: GameState,
    token: ChaosToken,
    investigator: InvestigatorId,
  ) => TokenEffect | null
  /** Modificador al horror que inflige el ataque de un enemigo (Pasillos del manicomio). */
  enemyHorrorModifier?: (state: GameState, enemy: Enemy) => number
  /** Modificador al combate/evasión de un enemigo (Savage Shantak). */
  enemyStat?: (state: GameState, enemy: Enemy, stat: 'fight' | 'evade') => number
  /** Modificador al velo de una localización (Parlor). */
  shroudModifier?: (state: GameState, location: Location) => number
  /** El acto solo se puede avanzar pagando pistas si se cumple (Meet and Greet). */
  actAdvanceAllowed?: (state: GameState) => boolean
  /** El investigador no puede comprometer cartas (William Bain rival). */
  cannotCommit?: (state: GameState, investigator: InvestigatorId) => boolean
  /** Al jugar un evento: si devuelve mensajes, sus efectos se cancelan y se resuelven estos. */
  eventPlayed?: (state: GameState, investigator: InvestigatorId, code: CardCode) => Message[] | null
  /** Acciones de cada investigador en su turno (Declan Pearce: 1 menos). */
  actionsModifier?: (state: GameState, investigator: InvestigatorId) => number
  /** Cambio del coste en recursos de las cartas de la mano del investigador (Cabina de luces). */
  cardCostModifier?: (state: GameState, investigator: InvestigatorId, code: CardCode) => number
  /** Cuántas cartas cuenta cada carta Oculta de su mano para el tamaño de mano (Bastidores). */
  hiddenHandWeight?: (state: GameState, investigator: InvestigatorId) => number
  /** Conexiones que el escenario añade a una localización (Pasadizos, Sr. Peabody). */
  connections?: (state: GameState, location: Location) => LocationId[]
  /** Conexiones adicionales solo cuando se mueve un enemigo (Biblioteca oculta). */
  enemyConnections?: (state: GameState, location: LocationId, enemy?: Enemy) => LocationId[]
  /**
   * Palabras clave que un enemigo gana (true) o pierde (false) por el escenario; null si no
   * cambia (Fortuna e insensatez: los Casino pierden Indiferente con alarma 6 o más).
   */
  enemyKeyword?: (state: GameState, enemy: Enemy, keyword: EnemyKeyword) => boolean | null
  /** Habilidad con la que se investiga ese Lugar (Cripta de la lámpara sepulcral). */
  investigateSkill?: (state: GameState, location: LocationId) => SkillType | null
  /**
   * Ranuras de más o de menos para un investigador (Caverna llena de huesos: 1 de mano
   * menos mientras la investigas). Se comprueban al empezar cada prueba de habilidad.
   */
  slotModifier?: (state: GameState, investigator: InvestigatorId, slot: SlotType) => number
  /** El investigador no puede descubrir pistas en ese Lugar (Capilla de san Auberto). */
  cannotDiscoverClues?: (
    state: GameState,
    investigator: InvestigatorId,
    location: LocationId,
  ) => boolean
  /** El investigador no puede salir de su Lugar (Cementerio Père Lachaise, Le Marais). */
  cannotLeave?: (state: GameState, investigator: InvestigatorId) => boolean
  /** Duplica el valor base o los iconos comprometidos de la prueba (Opéra Garnier). */
  skillDoubling?: (state: GameState, test: SkillTest) => { base?: boolean; icons?: boolean }
  /** La habilidad de la prueba no puede modificarse (Museo histórico al investigar). */
  skillUnmodified?: (state: GameState, test: SkillTest) => boolean
  /** El investigador no roba carta en la fase de Mantenimiento (Ashleigh Clarke). */
  skipsUpkeepDraw?: (state: GameState, investigator: InvestigatorId) => boolean
  forced?: (state: GameState, trigger: Trigger) => Message[]
  /** Reacciones de las cartas del escenario (localizaciones, plan, acto) para los investigadores. */
  reactions?: (state: GameState, trigger: Trigger) => ReactionOption[]
  /** El investigador puede entrar en `to` desde `from` (Habitación 212 cerrada con llave). */
  canEnter?: (
    state: GameState,
    investigator: InvestigatorId,
    from: LocationId | null,
    to: LocationId,
  ) => boolean
  /**
   * Al intentar moverse: si devuelve mensajes, se resuelven en su lugar (el escenario
   * vuelve a mandar el movimiento con `checked` si sigue adelante). Vestíbulo.
   */
  beforeMove?: (state: GameState, move: Extract<Message, { type: 'MoveTo' }>) => Message[] | null
}

/** Carta de Historia en juego: habilidades para cualquier investigador y forzados. */
export interface StoryBehavior {
  code: CardCode
  abilities?: AbilitiesFn<StoryCardInPlay>
  forced?: (state: GameState, trigger: Trigger, self: StoryCardInPlay) => Message[]
  /** Texto de "Preparación" al entrar en juego. */
  onEnter?: (state: GameState, self: StoryCardInPlay) => Message[]
}

export interface TreacheryBehavior {
  /** Acciones adicionales para entrar o salir de la localización a la que está unida (Arcane Lock). */
  moveCost?: number
  /** Modificador al velo de la localización a la que está unida (Flash Flood). */
  shroudModifier?: number
  /** Efecto de campaña si sigue en juego cuando termina la partida (o su dueño es eliminado). */
  whenGameEnds?: (state: GameState, self: Treachery) => Message[]
  code: CardCode
  /** Mensajes de su revelación. Si no la coloca en juego, se descarta al terminar. */
  revelation: (state: GameState, investigator: InvestigatorId, self: Treachery) => Message[]
  /**
   * En la zona de amenaza: coste adicional para que su investigador negocie (¿Qué has
   * hecho?). `null` si no puede pagarlo.
   */
  parleyCost?: (state: GameState, investigator: InvestigatorId) => Message[] | null
  /** Habilidades forzadas mientras está en juego. */
  forced?: (state: GameState, trigger: Trigger, self: Treachery) => Message[]
  abilities?: AbilitiesFn<Treachery>
  /** En la zona de amenaza: su dueño no puede jugar apoyos ni usar los de sus apoyos (The Necronomicon). */
  blocksAssets?: boolean
  blocksAssetReady?: boolean
  healthModifier?: number
  sanityModifier?: number
  cannotDiscard?: boolean
  /** Opciones durante la ventana de comprometer (Posesión (Traidora), desde la mano). */
  testOptions?: (state: GameState, test: SkillTest, self: Treachery) => ReactionOption[]
  /** Unida a una localización: los investigadores no pueden salir de ella (Secret Door). */
  blocksLeaving?: boolean
  /** El Lugar al que está unida no puede investigarse (Puerta cerrada con llave). */
  blocksInvestigation?: boolean
  /** En la zona de amenaza, como un apoyo: ranuras de su investigador que ocupa (Camisa de fuerza). */
  occupiesSlots?: Partial<Record<SlotType, number>>
  /**
   * En la zona de amenaza (o Oculta en la mano): lo que su investigador no puede hacer.
   * Tipos de carta que no puede jugar o comprometer, habilidades [fast] y moverse
   * más de una vez por turno (Whispers in Your Head, Dissonant Voices).
   */
  restricts?: {
    play?: PlayerCardDef['type'][]
    commit?: PlayerCardDef['type'][]
    fastAbilities?: boolean
    moveOncePerTurn?: boolean
    /** No puede atacar a enemigos con este rasgo (Regalo de la locura: Piedad). */
    attackTrait?: string
    /** No puede activar habilidades [action] de Lugares (Regalo de la locura: Miseria). */
    locationActionAbilities?: boolean
  }
  /** Se descarta en cuanto deja de cumplirse (Spires of Carcosa: su Lugar sin perdición). */
  persistsWhile?: (state: GameState, self: Treachery) => boolean
  /** En la zona de amenaza: acciones adicionales que cuesta una acción básica (Frozen in Fear). */
  actionCost?: (state: GameState, self: Treachery, action: Action) => number
  /** Vinculada a un enemigo: cambia sus valores y le quita palabras clave (Llevado a la locura). */
  attachedEnemy?: { fight?: number; evade?: number; health?: number; loses?: EnemyKeyword[] }
}

export interface EnemyBehavior {
  code: CardCode
  /** Assign this kind of attack damage to assets with the trait before other targets. */
  assignFirst?: Partial<Record<'damage' | 'horror', string>>
  forced?: (state: GameState, trigger: Trigger, self: Enemy) => Message[]
  /** Habilidades del enemigo para los investigadores de su localización (parlamento…). */
  abilities?: AbilitiesFn<Enemy>
  /** Reacciones que el enemigo ofrece a los investigadores (códex). */
  reactions?: (state: GameState, trigger: Trigger, self: Enemy) => ReactionOption[]
  /** Modificador a las habilidades de los investigadores de su localización (Whippoorwill). */
  skillModifier?: (state: GameState, self: Enemy, test: SkillTest) => number
  /**
   * Errante: localizaciones hacia las que se mueve en el paso 3.2 (vacío si ninguna).
   * `null`: ahora no tiene Errante (y, si lo tiene, resuelve Cazador).
   */
  patrol?: (state: GameState, self: Enemy) => LocationId[] | null
  /** Ahora no tiene Cazador aunque esté impreso (Seguridad del hotel con Clientes en juego). */
  losesHunter?: (state: GameState, self: Enemy) => boolean
  /**
   * Al ir a descartarse (también tras ser derrotado): si devuelve mensajes, se resuelven
   * en su lugar y sigue en juego. La derrota cuenta igualmente (El Extranjero, acto 2).
   */
  insteadOfDiscard?: (state: GameState, self: Enemy) => Message[] | null
  /** Al ir a ser derrotado: si devuelve mensajes, se resuelven en su lugar (no se derrota). */
  wouldBeDefeated?: (state: GameState, self: Enemy) => Message[] | null
  /**
   * Instrucción de aparición variable ("Lugar más cercano con…"): localizaciones
   * posibles para el investigador que lo roba. Vacío: no puede aparecer y se descarta.
   */
  spawn?: (state: GameState, investigator: InvestigatorId) => LocationId[]
  /** Gana Oleada (Clientas del hotel con el Director en juego). */
  surge?: (state: GameState) => boolean
  /** Cuando fuese a recibir daño: el daño que recibe en realidad y efectos añadidos. */
  damageTaken?: (
    state: GameState,
    self: Enemy,
    amount: number,
    source: DamageSource,
  ) => { amount: number; then?: Message[] }
  /** Los investigadores de su Lugar no pueden descubrir ni tomar el control de pistas. */
  blocksCluesHere?: boolean
  /** Sus ataques no pueden cancelarse (Sebastien Moreau). */
  attacksCannotBeCanceled?: boolean
  /** No ataca en la misma fase en la que se movió por Cazador (Glotón del manicomio). */
  noAttackAfterHunting?: boolean
  /** Su daño y horror se asignan a una sola carta hasta llenarla (Bestia de Aldebarán). */
  concentratedAssignment?: boolean
}

export interface LocationBehavior {
  code: CardCode
  /** Solo se ofrecen a investigadores en la localización (ya revelada). */
  abilities?: AbilitiesFn<Location>
  forced?: (state: GameState, trigger: Trigger, self: Location) => Message[]
  /** Forzado al revelarse, ya revelada (Vestíbulo: pone en juego dos Puertas). */
  onReveal?: (state: GameState, self: Location) => Message[]
}

export interface AgendaBehavior {
  code: CardCode
  /** Enemigos que no pueden recibir daño mientras este plan está en juego. */
  enemyImmune?: (state: GameState, enemy: Enemy) => boolean
  abilities?: AbilitiesFn<Agenda>
  forced?: (state: GameState, trigger: Trigger, self: Agenda) => Message[]
  /**
   * Al ir a avanzar por llegar a su umbral de perdición: si devuelve mensajes, se
   * resuelven en su lugar (La aterradora verdad).
   */
  insteadOfAdvance?: (state: GameState) => Message[] | null
  /** Se omite el paso "Coloca 1 perdición en el plan" de la fase de Mitos. */
  skipsMythosDoom?: boolean
  /** Las pistas colocadas sobre un enemigo pasan a ser perdición. */
  enemyCluesBecomeDoom?: boolean
  /** Instrucciones del reverso al avanzar. */
  onAdvance?: (state: GameState) => Message[]
  /** Instrucciones del reverso que se resuelven con el plan siguiente ya en juego. */
  afterAdvance?: (state: GameState) => Message[]
  /** Perdición que cuenta para su umbral, si no es la total en juego (La primera noche). */
  thresholdDoom?: (state: GameState) => number
}

export interface ActBehavior {
  code: CardCode
  abilities?: AbilitiesFn<Act>
  forced?: (state: GameState, trigger: Trigger, self: Act) => Message[]
  /** Para actos con objetivo de condición (`advanceTiming: 'objective'`). */
  objectiveMet?: (state: GameState) => boolean
  /** Las pistas de un investigador eliminado van al acto en vez de a su Lugar. */
  eliminatedCluesToAct?: boolean
  /** Instrucciones del reverso al avanzar. */
  onAdvance?: (state: GameState) => Message[]
}

const scenarios = new Map<string, ScenarioBehavior>()
const stories = new Map<CardCode, StoryBehavior>()

export function registerStory(behavior: StoryBehavior): void {
  stories.set(behavior.code, behavior)
}

export function storyBehavior(code: CardCode): StoryBehavior | undefined {
  return stories.get(code)
}
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

/**
 * Código impreso de una localización: las copias de una misma carta en juego llevan un
 * sufijo `~n` en su id (Arcadas de piedra en La máscara pálida).
 */
export const printedCode = (id: string): CardCode => id.replace(/~\d+$/, '')

export function locationBehavior(code: CardCode): LocationBehavior | undefined {
  return locations.get(printedCode(code))
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
  /** Printed permission to play this fast event in any player window. */
  playInAnyFastWindow?: boolean
  /** Dynamic modifiers of the test explicitly initiated by this event. */
  effectSkillModifier?: (state: GameState, test: SkillTest) => number
  effectAttackDamage?: (state: GameState, test: SkillTest) => number
  /** Asset fast abilities offered in every supported player window. */
  fastOptions?: (state: GameState, self: Asset) => ReactionOption[]
  /** Continuous additional actions, consumed before ordinary actions (Leo De Luca). */
  additionalTurnActions?: number
  /** Printed maximum of one asset with this trait per investigator. */
  limitTrait?: string
  limitTitle?: boolean
  /** Opens the printed reaction window after moving, before enemy engagement. */
  reactsBeforeEngagement?: boolean
  /** A player-card revelation, resolved from hand after weaknesses in the draw batch. */
  revelation?: (state: GameState, investigator: InvestigatorId) => Message[]
  /** Dilemma cards share their printed maximum across the group each round. */
  dilemma?: boolean
  /** Permission for a helper to commit from a different location. */
  commitFromLocation?: (state: GameState, test: SkillTest, by: InvestigatorId) => boolean
  /** Continuous modifiers while this event is attached to an asset. */
  attachedVitals?: { health?: number; sanity?: number }
  /** En juego: cambia la salud o la cordura de su dueño (El Manto Andrajoso, -1 cordura). */
  ownerVitals?: { health?: number; sanity?: number }
  /** En la mano: cambia el coste de cada otra carta de la mano (Broche de ónice negro). */
  handCostModifier?: number
  /** Bonus to each skill while resolving a triggered ability of the host asset. */
  attachedResolvingSkills?: number
  /** Skill bonus while attacking with the host asset. */
  attachedAttackSkill?: number
  /** Extra damage dealt to Monster enemies by successful attacks with the host asset. */
  attachedMonsterDamage?: number
  /** Hand/accessory slots the host stops taking up while attached (Tinker). */
  attachedSlotReduction?: number
  /** Optional reaction after the host asset is discarded; the attachment has left play too. */
  afterHostDiscarded?: (
    state: GameState,
    host: Asset,
    self: { code: CardCode; owner: InvestigatorId },
  ) => Choice | null
  /** Optional reaction after the host asset exhausts (index in host.upgrades). */
  afterHostExhausted?: (state: GameState, host: Asset, index: number) => Choice | null
  /** Triggered abilities printed on this event while it is attached (index in host.upgrades). */
  attachedAbilities?: (
    state: GameState,
    host: Asset,
    index: number,
    investigator: InvestigatorId,
  ) => AbilityOption[]
  /** Additive difficulty modifier while this card is committed. */
  committedDifficulty?: number
  /** Printed permission to commit without matching icons (e.g. Take Heart). */
  commitWithoutIcons?: boolean
  /** This card must be the only card committed, including other investigators. */
  exclusiveCommit?: boolean
  /** Damage added by a committed card to the attack itself, before defeat checks. */
  committedAttackDamage?: (state: GameState, test: SkillTest, by: InvestigatorId) => number
  /** Clues added to the successful investigation result, before discovery triggers. */
  committedInvestigationClues?: (state: GameState, test: SkillTest, by: InvestigatorId) => number
  /** Additional icons on this card, evaluated both in hand and while committed. */
  additionalIcons?: (
    state: GameState,
    test: SkillTest,
    by: InvestigatorId,
    zone?: 'hand' | 'discard' | 'committed',
  ) => PlayerCardDef['icons']
  /** Additional printed restriction, evaluated for the investigator committing this card. */
  canCommit?: (state: GameState, test: SkillTest, by: InvestigatorId) => boolean

  /** Pure, serializable continuations for delayed decisions and effects. */
  effect?: (
    state: GameState,
    investigator: InvestigatorId,
    step: string,
    data: Record<string, string | number | boolean>,
  ) => Message[]
  beforeResults?: (state: GameState, test: SkillTest, self: Asset) => Message[]
  /** Ranuras adicionales mientras está en juego (Carl Sanford: +1 arcana). */
  extraSlots?: Partial<Record<SlotType, number>>
  /** Additional slots that only assets with one of the traits may use (Bandolier: Weapon hand). */
  restrictedSlots?: { slot: SlotType; count: number; trait: string | string[] }[]
  /** Damage or horror printed as already on the asset when it enters play (Jessica Hyde). */
  entersPlayWith?: { damage?: number; horror?: number }
  /** Engage actions of its controller do not provoke attacks of opportunity (Trench Knife). */
  engageWithoutOpportunity?: boolean
  /** Printed cost X: chosen when paying; an asset enters play with X uses. */
  costX?: boolean
  /** Sin dueño (colocado en una localización o enemigo): habilidades para quien esté allí. */
  placedAbilities?: AbilitiesFn<PlacedAsset>
  placedForced?: (state: GameState, trigger: Trigger, self: PlacedAsset) => Message[]
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
  /** Carta comprometida: después del paso 8, con la prueba ya cerrada. */
  afterCommittedTestEnds?: PlayerCardBehavior['afterCommittedTest']
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
  /**
   * Puede recibir el daño y el horror de cualquier investigador de su localización,
   * aunque no tenga dueño (Sargento Monroe).
   */
  soaksAtLocation?: boolean
  /** Sin dueño: reacciones para los investigadores (las decide quien las active). */
  placedReactions?: (state: GameState, trigger: Trigger, self: PlacedAsset) => ReactionOption[]
  /** Se descarta al quedarse sin usos. */
  discardWhenEmpty?: boolean
  /** Absolute upper bound on uses, including uses added by other cards. */
  maxUses?: number
  /** Su acción es de evitar (cuenta como tal) o no provoca ataques de oportunidad. */
  evadeAction?: boolean
  noAttacksOfOpportunity?: boolean
  investigateAction?: boolean
  /** Enemy-specific protection while this asset is controlled (Delores Gadling). */
  ignoresOpportunityAttacks?: (state: GameState, self: Asset, enemy: Enemy) => boolean
  /** Test options also usable during another investigator's test at this location. */
  helpsOtherTests?: boolean
  /** Subscribe to action-ability completion without changing other games' queued messages. */
  observesActionAbilities?: boolean
  /** Efecto de campaña si está en la mano de su dueño cuando termina la partida o es eliminado. */
  whenGameEndsInHand?: (state: GameState, owner: InvestigatorId) => Message[]
  /** Mientras está en juego, la primera acción de cada turno de su dueño no provoca ataques de oportunidad. */
  firstActionSafe?: boolean
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
  startingAssets?: CardCode[]
  fastOptions?: (state: GameState, self: Investigator) => ReactionOption[]
  elderSign?: (state: GameState, self: Investigator) => TokenEffect
  reactions?: (state: GameState, trigger: Trigger, self: Investigator) => ReactionOption[]
  testOptions?: (state: GameState, test: SkillTest, self: Investigator) => ReactionOption[]
  /** Una acción adicional cada turno que solo sirve para evitar. */
  extraEvadeAction?: boolean
  /** Additional resources collected in the upkeep phase (Jenny Barnes). */
  upkeepResources?: number
  /** Después de robar la mano inicial (tras el mulligan): Lola Hayes elige su papel. */
  afterOpeningHand?: (state: GameState, self: Investigator) => Message[]
  /** Puede jugar, comprometer o activar capacidades de esta carta (Lola Hayes). */
  canUseCard?: (state: GameState, self: Investigator, code: CardCode) => boolean
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

/** Todas las cartas de jugador registradas (las de la caja y las de campaña). */
export function allPlayerCardDefs(): PlayerCardDef[] {
  return [...playerCards.values()]
}

export function playerCardDef(code: CardCode): PlayerCardDef | undefined {
  return playerCards.get(code)
}

export function playerCardBehavior(code: CardCode): PlayerCardBehavior | undefined {
  return playerBehaviors.get(code)
}

/** Permanente: no cuenta para el tamaño del mazo, no se quita de él y no abandona el juego. */
export const isPermanent = (code: CardCode) => !!playerBehaviors.get(code)?.permanent
