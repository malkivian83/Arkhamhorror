import { playerCardBehavior, scenarioBehavior } from './content'
import { EngineError } from './errors'
import { recomputeConnections } from './state'
import { shuffle, seedRng } from './rng'
import type {
  Boon,
  Act,
  CampaignLog,
  Agenda,
  CardCode,
  ChaosToken,
  Difficulty,
  EncounterCard,
  GameState,
  Investigator,
  InvestigatorId,
  Location,
  LocationCard,
  LocationId,
  Message,
  ScenarioTokenValues,
  SkillType,
  StoryEntry,
} from './types'

export const ENGINE_VERSION = 1

export type { LocationCard } from './types'

/** Todo lo necesario para preparar un escenario. */
export interface ScenarioDefinition {
  id: string
  /** Prólogo de la campaña (solo en su primer escenario). */
  prologue?: StoryEntry
  /** Introducción que se lee antes de empezar, en una o varias partes (solo en la mesa). */
  intro?: StoryEntry | StoryEntry[]
  /** Pasos de preparación de la guía, que la mesa muestra antes de empezar. */
  setupInstructions?: StoryEntry
  /** Localizaciones en juego al empezar (sin revelar). */
  locations: LocationCard[]
  /** Localizaciones apartadas, para efectos del escenario. */
  setAsideLocations?: LocationCard[]
  startingLocation: LocationId
  /** El investigador jefe empieza aquí y los demás en `startingLocation` (Excelsior). */
  leadStartingLocation?: LocationId
  agendas: Agenda[]
  acts: Act[]
  encounterDeck: EncounterCard[]
  /** Cartas apartadas, fuera de juego, que usarán los efectos del escenario. */
  setAside?: EncounterCard[]
  chaosBag: ChaosToken[]
  /** Valores fijos de los símbolos (si el escenario no registra `tokenEffect`). */
  tokenValues: ScenarioTokenValues
  /** Pasos de preparación tras colocar a los investigadores (perdición inicial, apoyos…). */
  setup?: Message[]
}

export interface InvestigatorSetup {
  id: string
  name: string
  skills: Record<SkillType, number>
  health: number
  sanity: number
  elderSignModifier?: number
  deck: CardCode[]
  /** En campaña: cada trauma físico/mental empieza el escenario como 1 daño/horror. */
  physicalTrauma?: number
  mentalTrauma?: number
}

export interface NewGameOptions {
  boons?: Boon[]
  weaknessChoices?: Record<string, CardCode[]>
  seed: number
  difficulty?: Difficulty
  /** Pausas en las pruebas de habilidad para la mesa de juego. */
  interactive?: boolean
  scenario: ScenarioDefinition
  investigators: InvestigatorSetup[]
  /** Registro de campaña del escenario anterior (o uno vacío al empezar). */
  campaignLog?: CampaignLog
}

/** Registro de campaña vacío para estos investigadores. */
export function emptyCampaignLog(investigators: InvestigatorId[]): CampaignLog {
  return {
    notes: [],
    crossedOut: [],
    values: {},
    chaosTokens: [],
    investigators: Object.fromEntries(
      investigators.map((id) => [
        id,
        { xp: 0, physicalTrauma: 0, mentalTrauma: 0, storyAssets: [] },
      ]),
    ),
  }
}

/**
 * Prepara la partida según "Setup" del reglamento, en el orden de la guía:
 * prólogo, elegir jefe, introducción, investigadores (apoyos permanentes,
 * recursos, mano inicial sin debilidades), mulligan, pasos de preparación del
 * escenario y colocación en la localización inicial (que se revela al entrar).
 */
export function prepareGame({
  seed,
  scenario,
  investigators,
  difficulty = 'standard',
  interactive = false,
  campaignLog,
  boons = [],
  weaknessChoices = {},
}: NewGameOptions): GameState {
  if (investigators.length < 1 || investigators.length > 4) {
    throw new EngineError('Una partida admite de 1 a 4 investigadores')
  }
  if (new Set(investigators.map((i) => i.id)).size !== investigators.length) {
    throw new EngineError('Cada jugador debe usar un investigador distinto')
  }
  if (!scenario.locations.some((l) => l.id === scenario.startingLocation)) {
    throw new EngineError('El Lugar inicial no está en juego')
  }
  if (scenario.agendas.length === 0 || scenario.acts.length === 0) {
    throw new EngineError('El escenario necesita al menos un plan y un acto')
  }

  let rng = seedRng(seed)
  // Las cartas permanentes no van en el mazo: empiezan en juego.
  const permanents = (setup: InvestigatorSetup) =>
    setup.deck.filter((code) => playerCardBehavior(code)?.permanent)
  const bonus = (setup: InvestigatorSetup, key: 'openingHand' | 'resources') =>
    permanents(setup).reduce((n, code) => n + (playerCardBehavior(code)?.permanent?.[key] ?? 0), 0)
  const players: Investigator[] = investigators.map((setup) => {
    let deck: CardCode[]
    ;[deck, rng] = shuffle(
      setup.deck.filter((code) => !playerCardBehavior(code)?.permanent),
      rng,
    )
    return {
      id: setup.id,
      name: setup.name,
      skills: { ...setup.skills },
      health: setup.health,
      sanity: setup.sanity,
      elderSignModifier: setup.elderSignModifier ?? 0,
      damage: setup.physicalTrauma ?? 0,
      horror: setup.mentalTrauma ?? 0,
      resources: 0,
      clues: 0,
      location: null,
      actionsRemaining: 0,
      turnTaken: false,
      eliminated: false,
      resigned: false,
      deck,
      hand: [],
      discard: [],
    }
  })

  const [encounterDeck, rngAfterEncounter] = shuffle(scenario.encounterDeck, rng)
  rng = rngAfterEncounter

  const locations: Record<LocationId, Location> = {}
  for (const card of scenario.locations) {
    locations[card.id] = { ...card, connections: [...card.connections], revealed: false, clues: 0 }
  }

  const story = (entries: StoryEntry | StoryEntry[] | undefined): Message[] =>
    interactive && entries
      ? [entries].flat().map((entry): Message => ({ type: 'Story', entry }))
      : []
  const setupMessages: Message[] = [
    ...story(scenario.prologue),
    { type: 'ChooseLead' },
    ...story(scenario.intro),
    ...investigators.flatMap((setup): Message[] => [
      ...permanents(setup).map((code): Message => ({
        type: 'PutAssetIntoPlay',
        investigator: setup.id,
        code,
      })),
      ...(weaknessChoices[setup.id]
        ? [
            {
              type: 'BoonMorrigan',
              investigator: setup.id,
              candidates: weaknessChoices[setup.id]!,
            } as Message,
          ]
        : []),
      ...(boons.includes('destiny')
        ? [{ type: 'BoonDestiny', investigator: setup.id } as Message]
        : []),
      {
        type: 'GainResources',
        investigator: setup.id,
        amount: 5 + bonus(setup, 'resources') + (boons.includes('hades') ? 2 : 0),
      },
      {
        type: 'DrawOpeningHand',
        investigator: setup.id,
        amount:
          5 +
          bonus(setup, 'openingHand') +
          (boons.includes('thoth') ? 1 : 0) -
          (boons.includes('destiny') ? 1 : 0),
      },
    ]),
    { type: 'InvestigatorsMulligan' },
    ...story(scenario.setupInstructions),
    ...(scenario.leadStartingLocation
      ? [
          {
            type: 'PlaceAtStart',
            lead: scenario.leadStartingLocation,
            others: scenario.startingLocation,
          } as Message,
        ]
      : players.map((p): Message => ({
          type: 'MoveTo',
          investigator: p.id,
          location: scenario.startingLocation,
        }))),
    ...(scenario.setup ?? []),
    { type: 'Round' },
  ]

  const rulesVersion = scenarioBehavior(scenario.id)?.rulesVersion
  return recomputeConnections({
    ...(boons.length ? { boons: [...new Set(boons)] } : {}),
    engineVersion: ENGINE_VERSION,
    scenarioId: scenario.id,
    ...(rulesVersion !== undefined ? { scenarioRulesVersion: rulesVersion } : {}),
    difficulty,
    interactive,
    rng,
    nextId: 1,
    round: 0,
    phase: 'setup',
    investigators: players,
    startingInvestigatorCount: players.length,
    locations,
    enemies: {},
    agendas: scenario.agendas.map((a) => ({ ...a })),
    agendaIndex: 0,
    doom: 0,
    acts: scenario.acts.map((a) => ({ ...a })),
    actIndex: 0,
    chaosBag: [...scenario.chaosBag],
    tokenValues: { ...scenario.tokenValues },
    encounterDeck,
    setAside: [...(scenario.setAside ?? [])],
    treacheries: {},
    surgePending: false,
    encounterDiscard: [],
    victoryDisplay: [],
    victoryPoints: 0,
    campaignLog: campaignLog ?? emptyCampaignLog(investigators.map((i) => i.id)),
    setAsideLocations: Object.fromEntries((scenario.setAsideLocations ?? []).map((l) => [l.id, l])),
    abilityUses: [],
    assets: {},
    log: [],
    skillTest: null,
    queue: setupMessages,
    pending: null,
    outcome: null,
  })
}
