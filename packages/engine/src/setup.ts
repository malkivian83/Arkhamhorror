import { EngineError } from './errors'
import { shuffle, seedRng } from './rng'
import type {
  Act,
  Agenda,
  CardCode,
  ChaosToken,
  Difficulty,
  EncounterCard,
  GameState,
  Investigator,
  Location,
  LocationId,
  Message,
  ScenarioTokenValues,
  SkillType,
} from './types'

export const ENGINE_VERSION = 1

export interface LocationCard {
  id: LocationId
  name: string
  shroud: number
  clueValue: number
  cluesPerInvestigator: boolean
  connections: LocationId[]
}

/** Todo lo necesario para preparar un escenario. */
export interface ScenarioDefinition {
  id: string
  /** Localizaciones en juego al empezar (sin revelar). */
  locations: LocationCard[]
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
}

export interface NewGameOptions {
  seed: number
  difficulty?: Difficulty
  scenario: ScenarioDefinition
  investigators: InvestigatorSetup[]
}

/**
 * Prepara la partida según "Setting Up a Game" del reglamento: recursos
 * iniciales, mano inicial, mazos de plan/acto/encuentros y colocación de los
 * investigadores en la localización inicial (que se revela al entrar).
 *
 * Pendiente: mulligan, debilidades durante la preparación, investigador jefe a elección.
 */
export function prepareGame({
  seed,
  scenario,
  investigators,
  difficulty = 'standard',
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
  const players: Investigator[] = investigators.map((setup) => {
    let deck: CardCode[]
    ;[deck, rng] = shuffle(setup.deck, rng)
    return {
      id: setup.id,
      name: setup.name,
      skills: { ...setup.skills },
      health: setup.health,
      sanity: setup.sanity,
      elderSignModifier: setup.elderSignModifier ?? 0,
      damage: 0,
      horror: 0,
      resources: 0,
      clues: 0,
      location: null,
      actionsRemaining: 0,
      turnTaken: false,
      eliminated: false,
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
    ...players.flatMap((p): Message[] => [
      { type: 'GainResources', investigator: p.id, amount: 5 },
      { type: 'DrawCards', investigator: p.id, amount: 5 },
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
    skillTest: null,
    queue: setupMessages,
    pending: null,
    outcome: null,
  }
}
