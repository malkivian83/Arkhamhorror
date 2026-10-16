/**
 * Utilidades para tests del motor. Escenario de prueba genérico (sin contenido
 * de ningún producto) con tres localizaciones en línea: A - B - C.
 */
import { applyInput, createGame, dispatch } from './engine'
import { EngineError } from './errors'
import type { InvestigatorSetup, ScenarioDefinition } from './setup'
import type { ChaosToken, EnemyCard, GameState, LabelParams, Message } from './types'

export const ghoul: EnemyCard = {
  kind: 'enemy',
  code: 'test-ghoul',
  name: 'Ghoul',
  fight: 2,
  health: 2,
  evade: 2,
  damage: 1,
  horror: 1,
  keywords: [],
}

export function testScenario(overrides: Partial<ScenarioDefinition> = {}): ScenarioDefinition {
  return {
    id: 'test',
    locations: [
      {
        id: 'A',
        name: 'Room A',
        shroud: 2,
        clueValue: 2,
        cluesPerInvestigator: true,
        connections: ['B'],
      },
      {
        id: 'B',
        name: 'Room B',
        shroud: 3,
        clueValue: 1,
        cluesPerInvestigator: false,
        connections: ['A', 'C'],
      },
      {
        id: 'C',
        name: 'Room C',
        shroud: 1,
        clueValue: 1,
        cluesPerInvestigator: true,
        connections: ['B'],
      },
    ],
    startingLocation: 'A',
    agendas: [
      { name: 'Agenda 1', doomThreshold: 3 },
      { name: 'Agenda 2', doomThreshold: 5 },
    ],
    acts: [
      { name: 'Act 1', clueThreshold: 2, cluesPerInvestigator: true, advanceTiming: 'anytime' },
    ],
    encounterDeck: Array.from({ length: 6 }, () => ({ ...ghoul })),
    chaosBag: [0],
    tokenValues: { skull: -1, cultist: -2, tablet: -3, elderThing: -4 },
    ...overrides,
  }
}

export function testInvestigator(
  id: string,
  overrides: Partial<InvestigatorSetup> = {},
): InvestigatorSetup {
  return {
    id,
    name: id.toUpperCase(),
    skills: { willpower: 3, intellect: 3, combat: 3, agility: 3 },
    health: 8,
    sanity: 8,
    deck: Array.from({ length: 20 }, (_, n) => `${id}-card-${n}`),
    ...overrides,
  }
}

export function newTestGame(
  options: {
    players?: string[]
    scenario?: Partial<ScenarioDefinition>
    investigator?: Partial<InvestigatorSetup>
  } = {},
): GameState {
  const players = options.players ?? ['a']
  return createGame({
    seed: 1,
    scenario: testScenario(options.scenario),
    investigators: players.map((id) => testInvestigator(id, options.investigator)),
  })
}

/** Elige la opción de la pregunta pendiente cuya etiqueta (y parámetros) coinciden. */
export function choose(state: GameState, label: string, params: LabelParams = {}): GameState {
  const pending = state.pending
  if (!pending) throw new EngineError(`No hay pregunta pendiente (buscando ${label})`)
  const index = pending.question.choices.findIndex(
    (c) => c.label === label && Object.entries(params).every(([k, v]) => c.params?.[k] === v),
  )
  if (index < 0) {
    const options = pending.question.choices.map(
      (c) => `${c.label} ${JSON.stringify(c.params ?? {})}`,
    )
    throw new EngineError(`Opción ${label} no disponible. Hay: ${options.join(', ')}`)
  }
  return applyInput(state, { investigator: pending.investigator, choice: index })
}

export function labels(state: GameState): string[] {
  return state.pending?.question.choices.map((c) => c.label) ?? []
}

/**
 * Durante el turno de un investigador: modifica el estado y/o resuelve mensajes
 * y vuelve a mostrarle su menú de acciones (recalculado).
 */
export function during(
  state: GameState,
  modify: (s: GameState) => GameState,
  ...messages: Message[]
): GameState {
  const pending = state.pending
  if (!pending || pending.question.prompt !== 'prompt.chooseAction') {
    throw new EngineError('during() solo se usa con el menú de acciones abierto')
  }
  return dispatch({ ...modify(state), pending: null }, ...messages, {
    type: 'PlayerWindow',
    investigator: pending.investigator,
  })
}

export function withBag(...tokens: ChaosToken[]) {
  return (s: GameState): GameState => ({ ...s, chaosBag: tokens })
}

export function spawnAt(
  location: string,
  card: EnemyCard = ghoul,
  engageWith: string | null = null,
): Message {
  return { type: 'SpawnEnemy', card, location, engageWith }
}

export const keep = (s: GameState) => s
