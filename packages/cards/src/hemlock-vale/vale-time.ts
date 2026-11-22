/**
 * Día y Noche de las cartas del Valle. Normalmente lo marca el Indicador de tiempo, pero en
 * La hermana perdida (p. 24) depende del Lugar: las cartas de un Lugar Oscuro (incluido el
 * propio Lugar) usan los efectos (Noche) y las demás, los (Día), sea cual sea la hora.
 */
import {
  getInvestigator,
  valleyTime,
  type Enemy,
  type GameState,
  type InvestigatorId,
  type LocationId,
} from '@lcg/engine'

const darkRules: Record<string, (state: GameState, location: LocationId) => boolean> = {}

/** El escenario decide qué Lugares son Oscuros (y con ello la hora de sus cartas). */
export function registerDarkLocations(
  scenario: string,
  rule: (state: GameState, location: LocationId) => boolean,
) {
  darkRules[scenario] = rule
}

/** Si las cartas de `location` usan sus efectos (Noche). */
export function nightAt(state: GameState, location: LocationId | null | undefined): boolean {
  const rule = darkRules[state.scenarioId]
  if (rule) return !!location && !!state.locations[location] && rule(state, location)
  return valleyTime(state.campaignLog)?.time === 'night'
}

/** Hora de un investigador (la de su Lugar). */
export const nightFor = (state: GameState, investigator: InvestigatorId) =>
  nightAt(state, getInvestigator(state, investigator).location)

/** Hora de un Enemigo (la de su Lugar). */
export const nightForEnemy = (state: GameState, enemy: Enemy) => nightAt(state, enemy.location)
