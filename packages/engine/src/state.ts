import {
  investigatorBehavior,
  playerCardBehavior,
  playerCardDef,
  scenarioBehavior,
  treacheryBehavior,
} from './content'
import { EngineError } from './errors'
import type {
  Agenda,
  CardCode,
  Enemy,
  EnemyId,
  EnemyKeyword,
  GameState,
  Investigator,
  InvestigatorId,
  Location,
  LocationId,
  Message,
  PlacedAsset,
  Prey,
} from './types'

/** A repeated turn in the same round has a distinct event position; no new state field is needed. */
export const turnStartedAt = (state: GameState): number =>
  state.log.findLastIndex((entry) => entry.key === 'log.step.turnBegins')

/** RR: Cannot overrides all ready effects, including upkeep. */
export const assetsCannotReady = (state: GameState, owner: InvestigatorId): boolean =>
  Object.values(state.treacheries).some(
    (t) =>
      t.placement.type === 'threatArea' &&
      t.placement.investigator === owner &&
      treacheryBehavior(t.code)?.blocksAssetReady,
  )

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
  if (!location) throw new EngineError(`Lugar desconocido: ${id}`)
  return location
}

/** Printed health/sanity plus continuous modifiers; trauma still uses printed values. */
export function effectiveVitals(
  state: GameState,
  investigator: Investigator,
): { health: number; sanity: number } {
  const attached = Object.values(state.treacheries).filter(
    (t) => t.placement.type === 'threatArea' && t.placement.investigator === investigator.id,
  )
  const owned = Object.values(state.assets).filter((a) => a.owner === investigator.id)
  const fromAssets = (k: 'health' | 'sanity') =>
    owned.reduce((n, a) => n + (playerCardBehavior(a.code)?.ownerVitals?.[k] ?? 0), 0)
  return {
    health: Math.max(
      0,
      investigator.health +
        attached.reduce((n, t) => n + (treacheryBehavior(t.code)?.healthModifier ?? 0), 0) +
        fromAssets('health'),
    ),
    sanity: Math.max(
      0,
      investigator.sanity +
        attached.reduce((n, t) => n + (treacheryBehavior(t.code)?.sanityModifier ?? 0), 0) +
        fromAssets('sanity'),
    ),
  }
}

/** Velo actual de una localización, con los modificadores de la ronda (nunca menos de 0). */
export function shroudOf(state: GameState, id: LocationId): number {
  const location = getLocation(state, id)
  const attached = Object.values(state.treacheries)
    // Unidas a este Lugar, o junto al plan con efecto en cada Lugar (Cieno e impurezas).
    .filter(
      (t) =>
        (t.placement.type === 'location' && t.placement.location === id) ||
        t.placement.type === 'agenda',
    )
    .reduce((sum, t) => sum + (treacheryBehavior(t.code)?.shroudModifier ?? 0), 0)
  const scenario = scenarioBehavior(state.scenarioId)?.shroudModifier?.(state, location) ?? 0
  return Math.max(0, location.shroud + (location.shroudModifier ?? 0) + attached + scenario)
}

/**
 * Conexiones de las localizaciones con símbolo: una localización conecta con las
 * que muestran alguno de sus símbolos de conexión (según la cara que esté a la vista).
 */
export function recomputeConnections(state: GameState): GameState {
  const face = (l: Location) =>
    !l.revealed && l.unrevealed ? l.unrevealed : { symbol: l.symbol, connectsTo: l.connectsTo }
  const all = Object.values(state.locations)
  if (
    !all.some((l) => l.symbol !== undefined || l.extraConnections?.length) &&
    !scenarioBehavior(state.scenarioId)?.connections
  )
    return state
  const locations = { ...state.locations }
  for (const l of all) {
    const bySymbol =
      l.symbol === undefined
        ? l.connections
        : all
            .filter(
              (o) => o.id !== l.id && (face(l).connectsTo ?? []).includes(face(o).symbol ?? ''),
            )
            .map((o) => o.id)
    const extra = [
      ...(l.extraConnections ?? []),
      ...(scenarioBehavior(state.scenarioId)?.connections?.(state, l) ?? []),
    ].filter((id) => id !== l.id && state.locations[id])
    locations[l.id] = { ...l, connections: [...new Set([...bySymbol, ...extra])] }
  }
  return { ...state, locations }
}

/** Localización de un apoyo sin dueño (la del enemigo al que está vinculado, si es el caso). */
export function placedLocation(state: GameState, placed: PlacedAsset): LocationId | null {
  if (placed.placement.type === 'location') return placed.placement.location
  return state.enemies[placed.placement.enemy]?.location ?? null
}

/** Modificadores de las traiciones vinculadas a un enemigo (Llevado a la locura). */
function attachedModifiers(state: GameState, enemy: EnemyId) {
  return Object.values(state.treacheries)
    .filter((t) => t.placement.type === 'enemy' && t.placement.enemy === enemy)
    .flatMap((t) => {
      const modifiers = treacheryBehavior(t.code)?.attachedEnemy
      return modifiers ? [modifiers] : []
    })
}

/** Palabras clave que tiene ahora el enemigo (sin las que le quitan sus vinculadas). */
export function enemyHasKeyword(state: GameState, enemy: Enemy, keyword: EnemyKeyword): boolean {
  const test = state.skillTest
  const target =
    test &&
    (test.kind.type === 'fight' || test.kind.type === 'evade') &&
    test.kind.enemy === enemy.id
  const added = target && test.addedEnemyKeywords?.includes(keyword)
  const changed = scenarioBehavior(state.scenarioId)?.enemyKeyword?.(state, enemy, keyword)
  if (changed === false) return false
  if (changed === true) return true
  // Keywords gained until the end of the round (Pay Your Dues: aloof).
  const gained = (enemy.roundKeywords ?? []).some(
    (k) => k.keyword === keyword && k.round === state.round,
  )
  return (
    (enemy.keywords.includes(keyword) || !!added || gained) &&
    !attachedModifiers(state, enemy.id).some((m) => m.loses?.includes(keyword))
  )
}

/** Combate o evasión del enemigo con sus vinculadas (sin los modificadores de escenario). */
export function attachedStat(state: GameState, enemy: EnemyId, stat: 'fight' | 'evade'): number {
  return attachedModifiers(state, enemy).reduce((n, m) => n + (m[stat] ?? 0), 0)
}

/** Salud máxima del enemigo con sus vinculadas. */
export function enemyMaxHealth(state: GameState, enemy: Enemy): number {
  return (
    enemy.maxHealth + attachedModifiers(state, enemy.id).reduce((n, m) => n + (m.health ?? 0), 0)
  )
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

/**
 * El investigador puede jugar, comprometer o activar capacidades de esta carta (Lola Hayes:
 * solo cartas neutrales o de su papel).
 */
export function cardAllowed(state: GameState, id: InvestigatorId, code: CardCode): boolean {
  const investigator = state.investigators.find((i) => i.id === id)
  if (!investigator) return true
  return investigatorBehavior(investigator.id)?.canUseCard?.(state, investigator, code) ?? true
}

/**
 * Cards the investigator may play as if they were in hand: the hand plus, with an asset
 * such as Wendy's Amulet, the topmost event of their discard pile.
 */
export function playableHand(state: GameState, id: InvestigatorId): CardCode[] {
  const investigator = state.investigators.find((i) => i.id === id)
  if (!investigator) return []
  const top = investigator.discard.at(-1)
  const fromDiscard =
    top !== undefined &&
    playerCardDef(top)?.type === 'event' &&
    Object.values(state.assets).some(
      (a) => a.owner === id && playerCardBehavior(a.code)?.playsTopDiscardEvent,
    )
  return fromDiscard ? [...investigator.hand, top] : investigator.hand
}

/** Wendy's Amulet: its controller's events go to the bottom of their deck, not the discard. */
export function eventsToDeckBottom(state: GameState, owner: InvestigatorId): boolean {
  return Object.values(state.assets).some(
    (a) => a.owner === owner && playerCardBehavior(a.code)?.eventsToDeckBottom,
  )
}

/** La carta es de esta clase o papel (las multiclase, de cualquiera de las suyas). */
export function cardOfRole(code: CardCode, role: string | undefined): boolean {
  const def = playerCardDef(code)
  return !!role && !!def && (def.classes ?? [def.class]).includes(role)
}

/** Planes en curso: el del mazo principal y, si lo hay, el del segundo mazo de Plan. */
export function currentAgendas(state: GameState): Agenda[] {
  const second = state.secondAgenda
  return [
    state.agendas[state.agendaIndex],
    ...(second ? [second.agendas[second.index]] : []),
  ].filter((a): a is Agenda => !!a)
}

/** Jefe elegido entre los activos; en partidas antiguas, el primero que siga en juego. */
export function leadInvestigator(state: GameState): Investigator | undefined {
  const active = activeInvestigators(state)
  return active.find((i) => i.id === state.leadInvestigatorId) ?? active[0]
}

export function investigatorsAt(state: GameState, location: LocationId): Investigator[] {
  return activeInvestigators(state).filter((i) => i.location === location)
}

export function enemiesAt(state: GameState, location: LocationId): Enemy[] {
  return Object.values(state.enemies).filter((e) => e.location === location)
}

export function engagedEnemies(state: GameState, investigator: InvestigatorId): Enemy[] {
  const owner = getInvestigator(state, investigator)
  if (owner.eliminated || owner.location === null) return []
  // RR Massive: a ready enemy is engaged with every investigator at its location;
  // it stays at that location instead of entering any investigator's threat area.
  return Object.values(state.enemies).filter((e) =>
    e.keywords.includes('massive')
      ? !e.exhausted && e.location === owner.location
      : e.engagedWith === investigator,
  )
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
/** Conexiones por las que puede moverse un enemigo (las de todos y las propias del escenario). */
export function enemyNeighbours(
  state: GameState,
  location: LocationId,
  /** El enemigo que se mueve, si las conexiones del escenario dependen de él (Byakhee). */
  mover?: Enemy,
): LocationId[] {
  const extra = scenarioBehavior(state.scenarioId)?.enemyConnections?.(state, location, mover) ?? []
  return [...new Set([...(state.locations[location]?.connections ?? []), ...extra])]
}

export function distancesFrom(
  state: GameState,
  from: LocationId,
  /** Para el movimiento de un enemigo (incluye `enemyConnections` del escenario). */
  enemy: boolean | Enemy = false,
): Map<LocationId, number> {
  const distances = new Map<LocationId, number>([[from, 0]])
  let frontier: LocationId[] = [from]
  while (frontier.length > 0) {
    const next: LocationId[] = []
    for (const current of frontier) {
      for (const neighbour of enemy
        ? enemyNeighbours(state, current, enemy === true ? undefined : enemy)
        : (state.locations[current]?.connections ?? [])) {
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
  if (prey.type === 'investigator') {
    const preferred = candidates.filter((i) => i.id === prey.investigator)
    return preferred.length ? preferred : candidates
  }
  const value = (i: Investigator) =>
    prey.type === 'mostResources'
      ? i.resources
      : prey.type === 'mostClues'
        ? i.clues
        : prey.type === 'mostHorror'
          ? i.horror
          : prey.type === 'mostRemainingSanity'
            ? i.sanity - i.horror
            : prey.type === 'lowestRemainingSanity'
              ? i.horror - i.sanity
              : prey.type === 'lowestRemainingHealth'
                ? i.damage - i.health
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
  const distances = distancesFrom(state, enemy.location, enemy)
  const reachable = activeInvestigators(state).filter(
    (i) => i.location !== null && distances.has(i.location),
  )
  if (reachable.length === 0) return []
  const distance = (i: Investigator) => distances.get(i.location as LocationId) ?? 0
  const nearest = Math.min(...reachable.map(distance))
  if (nearest === 0) return []
  const closest = reachable.filter((i) => distance(i) === nearest)
  const prey = scenarioBehavior(state.scenarioId)?.enemyPrey?.(state, enemy) ?? enemy.prey
  const preferred = bestByPrey(closest, prey)
  const targets = new Set((preferred.length ? preferred : closest).map((i) => i.location))
  return enemyNeighbours(state, enemy.location, enemy).filter((step) => {
    if (!state.locations[step]) return false
    const fromStep = distancesFrom(state, step, enemy)
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
