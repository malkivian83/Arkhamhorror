import { EngineError } from './errors'
import type {
  Enemy,
  EnemyId,
  GameState,
  Investigator,
  InvestigatorId,
  Location,
  LocationId,
  Message,
} from './types'

/** Inserta mensajes delante de la cola (se procesan antes que lo ya encolado). */
export function push(state: GameState, ...messages: Message[]): GameState {
  return { ...state, queue: [...messages, ...state.queue] }
}

export function getInvestigator(state: GameState, id: InvestigatorId): Investigator {
  const investigator = state.investigators.find((i) => i.id === id)
  if (!investigator) throw new EngineError(`Investigador desconocido: ${id}`)
  return investigator
}

export function getLocation(state: GameState, id: LocationId): Location {
  const location = state.locations[id]
  if (!location) throw new EngineError(`Localización desconocida: ${id}`)
  return location
}

export function getEnemy(state: GameState, id: EnemyId): Enemy {
  const enemy = state.enemies[id]
  if (!enemy) throw new EngineError(`Enemigo desconocido: ${id}`)
  return enemy
}

export function findEnemy(state: GameState, id: EnemyId): Enemy | undefined {
  return state.enemies[id]
}

export function updateInvestigator(
  state: GameState,
  id: InvestigatorId,
  update: (investigator: Investigator) => Investigator,
): GameState {
  getInvestigator(state, id)
  return {
    ...state,
    investigators: state.investigators.map((i) => (i.id === id ? update(i) : i)),
  }
}

export function updateLocation(
  state: GameState,
  id: LocationId,
  update: (location: Location) => Location,
): GameState {
  return { ...state, locations: { ...state.locations, [id]: update(getLocation(state, id)) } }
}

export function updateEnemy(
  state: GameState,
  id: EnemyId,
  update: (enemy: Enemy) => Enemy,
): GameState {
  return { ...state, enemies: { ...state.enemies, [id]: update(getEnemy(state, id)) } }
}

export function removeEnemy(state: GameState, id: EnemyId): GameState {
  const { [id]: _removed, ...rest } = state.enemies
  return { ...state, enemies: rest }
}

export function activeInvestigators(state: GameState): Investigator[] {
  return state.investigators.filter((i) => !i.eliminated)
}

/** El investigador jefe: el primero en el orden de jugadores que siga en juego. */
export function leadInvestigator(state: GameState): Investigator | undefined {
  return activeInvestigators(state)[0]
}

export function investigatorsAt(state: GameState, location: LocationId): Investigator[] {
  return activeInvestigators(state).filter((i) => i.location === location)
}

export function enemiesAt(state: GameState, location: LocationId): Enemy[] {
  return Object.values(state.enemies).filter((e) => e.location === location)
}

export function engagedEnemies(state: GameState, investigator: InvestigatorId): Enemy[] {
  return Object.values(state.enemies).filter((e) => e.engagedWith === investigator)
}

/** Valor "por investigador": usa los investigadores que empezaron el escenario. */
export function perInvestigator(state: GameState, value: number, applies: boolean): number {
  return applies ? value * state.startingInvestigatorCount : value
}

export function newId(state: GameState, prefix: string): [string, GameState] {
  return [`${prefix}${state.nextId}`, { ...state, nextId: state.nextId + 1 }]
}

/**
 * Siguiente paso del camino más corto desde `from` hasta alguna localización
 * que cumpla `isTarget`. Devuelve `null` si ya está en un objetivo o no hay camino.
 * Con empate gana la primera conexión listada (decisión del investigador jefe por defecto).
 */
export function nextStepToward(
  state: GameState,
  from: LocationId,
  isTarget: (location: LocationId) => boolean,
): LocationId | null {
  if (isTarget(from)) return null
  const firstStep = new Map<LocationId, LocationId>()
  const visited = new Set<LocationId>([from])
  let frontier: LocationId[] = [from]
  while (frontier.length > 0) {
    const next: LocationId[] = []
    for (const current of frontier) {
      for (const neighbour of getLocation(state, current).connections) {
        if (visited.has(neighbour) || !state.locations[neighbour]) continue
        visited.add(neighbour)
        const step = current === from ? neighbour : (firstStep.get(current) as LocationId)
        if (isTarget(neighbour)) return step
        firstStep.set(neighbour, step)
        next.push(neighbour)
      }
    }
    frontier = next
  }
  return null
}
