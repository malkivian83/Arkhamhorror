import { treacheryBehavior } from './content'
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
  Prey,
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

/** Velo actual de una localización, con los modificadores de la ronda (nunca menos de 0). */
export function shroudOf(state: GameState, id: LocationId): number {
  const location = getLocation(state, id)
  const attached = Object.values(state.treacheries)
    .filter((t) => t.placement.type === 'location' && t.placement.location === id)
    .reduce((sum, t) => sum + (treacheryBehavior(t.code)?.shroudModifier ?? 0), 0)
  return Math.max(0, location.shroud + (location.shroudModifier ?? 0) + attached)
}

/**
 * Conexiones de las localizaciones con símbolo: una localización conecta con las
 * que muestran alguno de sus símbolos de conexión (según la cara que esté a la vista).
 */
export function recomputeConnections(state: GameState): GameState {
  const face = (l: Location) =>
    !l.revealed && l.unrevealed ? l.unrevealed : { symbol: l.symbol, connectsTo: l.connectsTo }
  const all = Object.values(state.locations)
  if (!all.some((l) => l.symbol !== undefined)) return state
  const locations = { ...state.locations }
  for (const l of all) {
    if (l.symbol === undefined) continue
    const mine = face(l).connectsTo ?? []
    locations[l.id] = {
      ...l,
      connections: all
        .filter((o) => o.id !== l.id && mine.includes(face(o).symbol ?? ''))
        .map((o) => o.id),
    }
  }
  return { ...state, locations }
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

/** Distancia (en conexiones) desde `from` a cada localización a la que se puede llegar. */
export function distancesFrom(state: GameState, from: LocationId): Map<LocationId, number> {
  const distances = new Map<LocationId, number>([[from, 0]])
  let frontier: LocationId[] = [from]
  while (frontier.length > 0) {
    const next: LocationId[] = []
    for (const current of frontier) {
      for (const neighbour of state.locations[current]?.connections ?? []) {
        if (distances.has(neighbour) || !state.locations[neighbour]) continue
        distances.set(neighbour, (distances.get(current) ?? 0) + 1)
        next.push(neighbour)
      }
    }
    frontier = next
  }
  return distances
}

/**
 * Los candidatos que mejor cumplen la presa de un enemigo (todos si no tiene
 * presa). Si quedan varios empatados, decide el jefe.
 */
export function bestByPrey(candidates: Investigator[], prey: Prey | undefined): Investigator[] {
  if (!prey || candidates.length === 0) return candidates
  if (prey.type === 'only') return candidates.filter((i) => i.id === prey.investigator)
  const value = (i: Investigator) =>
    prey.type === 'mostResources'
      ? i.resources
      : prey.type === 'highestSkill'
        ? i.skills[prey.skill]
        : -i.skills[prey.skill]
  const best = Math.max(...candidates.map(value))
  return candidates.filter((i) => value(i) === best)
}

/**
 * Reglamento, "Hunter": localizaciones conectadas a las que puede moverse un
 * cazador por el camino más corto hacia el investigador más cercano (el que
 * mejor cumpla su presa, si hay varios a la misma distancia). Vacío si ya hay un
 * investigador en su localización o no puede llegar a ninguno. Con varias
 * opciones, decide el jefe.
 */
export function huntingSteps(state: GameState, enemy: Enemy): LocationId[] {
  const distances = distancesFrom(state, enemy.location)
  const reachable = activeInvestigators(state).filter(
    (i) => i.location !== null && distances.has(i.location),
  )
  if (reachable.length === 0) return []
  const distance = (i: Investigator) => distances.get(i.location as LocationId) ?? 0
  const nearest = Math.min(...reachable.map(distance))
  if (nearest === 0) return []
  const closest = reachable.filter((i) => distance(i) === nearest)
  const preferred = bestByPrey(closest, enemy.prey)
  const targets = new Set((preferred.length ? preferred : closest).map((i) => i.location))
  return (state.locations[enemy.location]?.connections ?? []).filter((step) => {
    if (!state.locations[step]) return false
    const fromStep = distancesFrom(state, step)
    return [...targets].some((t) => fromStep.get(t as LocationId) === nearest - 1)
  })
}

/**
 * La localización más cercana (incluida `from`) que cumple `matches`, por
 * número de conexiones. Con empate, la primera encontrada (decide el jefe).
 */
export function nearestLocation(
  state: GameState,
  from: LocationId,
  matches: (location: LocationId) => boolean,
): LocationId | null {
  const visited = new Set<LocationId>([from])
  let frontier: LocationId[] = [from]
  while (frontier.length > 0) {
    const found = frontier.find(matches)
    if (found !== undefined) return found
    const next: LocationId[] = []
    for (const current of frontier) {
      for (const neighbour of getLocation(state, current).connections) {
        if (visited.has(neighbour) || !state.locations[neighbour]) continue
        visited.add(neighbour)
        next.push(neighbour)
      }
    }
    frontier = next
  }
  return null
}
