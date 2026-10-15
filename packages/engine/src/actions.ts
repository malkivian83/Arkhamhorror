import {
  activeInvestigators,
  enemiesAt,
  engagedEnemies,
  getInvestigator,
  getLocation,
  perInvestigator,
} from './state'
import type { Action, Choice, GameState, InvestigatorId } from './types'

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

/** Pistas necesarias para avanzar el acto actual. */
export function cluesToAdvanceAct(state: GameState): number | null {
  const act = state.acts[state.actIndex]
  if (!act) return null
  return perInvestigator(state, act.clueThreshold, act.cluesPerInvestigator)
}

export function canAdvanceAct(state: GameState): boolean {
  const required = cluesToAdvanceAct(state)
  if (required === null) return false
  const available = activeInvestigators(state).reduce((sum, i) => sum + i.clues, 0)
  return available >= required
}

/** Las acciones que no provocan ataques de oportunidad. */
export function provokesAttacksOfOpportunity(action: Action): boolean {
  return action.kind !== 'fight' && action.kind !== 'evade'
}
