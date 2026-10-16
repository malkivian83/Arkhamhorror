import { actBehavior, agendaBehavior, locationBehavior, treacheryBehavior } from './content'
import {
  activeInvestigators,
  enemiesAt,
  engagedEnemies,
  getInvestigator,
  getLocation,
  perInvestigator,
} from './state'
import type {
  AbilityLimit,
  AbilityOption,
  Action,
  Choice,
  GameState,
  Investigator,
  InvestigatorId,
} from './types'

/** Acciones básicas que el investigador puede realizar ahora mismo. */
export function availableActions(state: GameState, id: InvestigatorId): Action[] {
  const investigator = getInvestigator(state, id)
  if (investigator.eliminated || investigator.location === null) return []
  const here = investigator.location
  const location = getLocation(state, here)
  const enemiesHere = enemiesAt(state, here)

  return [
    { kind: 'draw' },
    { kind: 'resource' },
    { kind: 'investigate' },
    ...location.connections
      .filter((to) => state.locations[to])
      .map((to): Action => ({ kind: 'move', to })),
    // Un enemigo distante (aloof) no enfrentado no puede ser atacado.
    ...enemiesHere
      .filter((e) => e.engagedWith !== null || !e.keywords.includes('aloof'))
      .map((e): Action => ({ kind: 'fight', enemy: e.id })),
    ...engagedEnemies(state, id).map((e): Action => ({ kind: 'evade', enemy: e.id })),
    ...enemiesHere
      .filter((e) => e.engagedWith !== id)
      .map((e): Action => ({ kind: 'engage', enemy: e.id })),
  ]
}

/** Etiqueta i18n y parámetros de una acción, para mostrarla al jugador. */
export function describeAction(state: GameState, id: InvestigatorId, action: Action): Choice {
  switch (action.kind) {
    case 'draw':
    case 'resource':
      return { label: `action.${action.kind}`, then: [] }
    case 'investigate': {
      const location = getLocation(state, getInvestigator(state, id).location as string)
      return { label: 'action.investigate', params: { location: location.name }, then: [] }
    }
    case 'move':
      return {
        label: 'action.move',
        params: { location: getLocation(state, action.to).name },
        then: [],
      }
    case 'fight':
    case 'evade':
    case 'engage': {
      const enemy = state.enemies[action.enemy]
      return { label: `action.${action.kind}`, params: { enemy: enemy?.name ?? '?' }, then: [] }
    }
  }
}

/** Pistas necesarias para avanzar el acto actual (null si no avanza con pistas). */
export function cluesToAdvanceAct(state: GameState): number | null {
  const act = state.acts[state.actIndex]
  if (!act || act.advanceTiming === 'objective') return null
  return perInvestigator(state, act.clueThreshold, act.cluesPerInvestigator)
}

/** Investigadores que pueden aportar pistas al acto actual. */
export function actContributors(state: GameState): Investigator[] {
  const act = state.acts[state.actIndex]
  const at = act?.cluesAtLocation
  return activeInvestigators(state).filter((i) => at === undefined || i.location === at)
}

export function canAdvanceAct(state: GameState): boolean {
  const required = cluesToAdvanceAct(state)
  if (required === null) return false
  const available = actContributors(state).reduce((sum, i) => sum + i.clues, 0)
  return available >= required
}

export function withinLimit(
  state: GameState,
  key: string,
  investigator: InvestigatorId,
  limit: AbilityLimit | undefined,
): boolean {
  if (!limit) return true
  return !state.abilityUses.some(
    (u) =>
      u.key === key &&
      (limit.group || u.investigator === investigator) &&
      (limit.per === 'game' || u.round === state.round),
  )
}

/**
 * Habilidades activadas disponibles para el investigador: de su localización,
 * del plan y el acto actuales y de las traiciones en su zona de amenaza o en su
 * localización (RR "Activate"). Se filtran por límites y acciones restantes.
 */
export function availableAbilities(state: GameState, id: InvestigatorId): AbilityOption[] {
  const investigator = getInvestigator(state, id)
  if (investigator.eliminated || investigator.location === null) return []
  const here = investigator.location
  const location = getLocation(state, here)
  const agenda = state.agendas[state.agendaIndex]
  const act = state.acts[state.actIndex]
  const treacheries = Object.values(state.treacheries).filter((t) => {
    const p = t.placement
    if (p.type === 'location') return p.location === here
    if (p.type === 'threatArea') {
      return p.investigator === id || getInvestigator(state, p.investigator).location === here
    }
    return false
  })
  const options = [
    ...(location.revealed
      ? (locationBehavior(location.id)?.abilities?.(state, location, id) ?? [])
      : []),
    ...(agenda ? (agendaBehavior(agenda.code)?.abilities?.(state, agenda, id) ?? []) : []),
    ...(act ? (actBehavior(act.code)?.abilities?.(state, act, id) ?? []) : []),
    ...treacheries.flatMap((t) => treacheryBehavior(t.code)?.abilities?.(state, t, id) ?? []),
  ]
  return options.filter(
    (a) => a.actions <= investigator.actionsRemaining && withinLimit(state, a.key, id, a.limit),
  )
}

/** Las acciones que no provocan ataques de oportunidad. */
export function provokesAttacksOfOpportunity(action: Action): boolean {
  return action.kind !== 'fight' && action.kind !== 'evade'
}
