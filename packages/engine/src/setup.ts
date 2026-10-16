import { playerCardBehavior } from './content'
import { EngineError } from './errors'
import { shuffle, seedRng } from './rng'
import type {
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
  /** Introducción que se lee antes de empezar (solo en la mesa). */
  intro?: StoryEntry
  /** Localizaciones en juego al empezar (sin revelar). */
  locations: LocationCard[]
  /** Localizaciones apartadas, para efectos del escenario. */
  setAsideLocations?: LocationCard[]
  startingLocation: LocationId
  agendas: Agenda[]
  acts: Act[]
  encounterDeck: EncounterCard[]
  /** Cartas apartadas, fuera de juego, que usarán los efectos del escenario. */
  setAside?: EncounterCard[]
  chaosBag: ChaosToken[]
  /** Valores fijos de los símbolos (si el escenario no registra `tokenEffect`). */
  tokenValues: ScenarioTokenValues
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
  seed: number
  difficulty?: Difficulty
  /** Pausas en las pruebas de habilidad para la mesa de juego. */
  interactive?: boolean
  scenario: ScenarioDefinition
  investigators: InvestigatorSetup[]
  /** Registro de campaña del escenario anterior (o uno vacío al empezar). */
  campaignLog?: CampaignLog
}

/**
 * Prepara la partida según "Setting Up a Game" del reglamento: recursos
 * iniciales, mano inicial, mazos de plan/acto/encuentros y colocación de los
 * investigadores en la localización inicial (que se revela al entrar).
 *
 * Pendiente: mulligan, debilidades durante la preparación, investigador jefe a elección.
 */
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

export function prepareGame({
  seed,
  scenario,
  investigators,
  difficulty = 'standard',
  interactive = false,
  campaignLog,
}: NewGameOptions): GameState {
  if (investigators.length < 1 || investigators.length > 4) {
    throw new EngineError('Una partida admite de 1 a 4 investigadores')
  }
  if (new Set(investigators.map((i) => i.id)).size !== investigators.length) {
    throw new EngineError('Cada jugador debe usar un investigador distinto')
  }
  if (!scenario.locations.some((l) => l.id === scenario.startingLocation)) {
    throw new EngineError('La localización inicial no está en juego')
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

  const setupMessages: Message[] = [
    ...(interactive && scenario.intro ? [{ type: 'Story', entry: scenario.intro } as Message] : []),
    ...investigators.flatMap((setup): Message[] => [
      ...permanents(setup).map((code): Message => ({
        type: 'PutAssetIntoPlay',
        investigator: setup.id,
        code,
      })),
      { type: 'GainResources', investigator: setup.id, amount: 5 + bonus(setup, 'resources') },
      {
        type: 'DrawCards',
        investigator: setup.id,
        amount: 5 + bonus(setup, 'openingHand'),
        opening: true,
      },
    ]),
    ...players.map((p): Message => ({
      type: 'MoveTo',
      investigator: p.id,
      location: scenario.startingLocation,
    })),
    { type: 'Round' },
  ]

  return {
    engineVersion: ENGINE_VERSION,
    scenarioId: scenario.id,
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
  }
}
