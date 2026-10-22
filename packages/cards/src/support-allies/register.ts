import {
  enemiesAt,
  getInvestigator,
  getLocation,
  playerCardDef,
  type Choice,
  type GameState,
  type InvestigatorId,
  type Message,
} from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'

export const cardName = (code: string) => playerCardDef(code)!.name

/** Enemies at the location of an investigator. */
export const enemiesHere = (state: GameState, investigator: InvestigatorId) => {
  const here = getInvestigator(state, investigator).location
  return here === null ? [] : enemiesAt(state, here)
}

/** Choose an enemy at your location and deal it damage. */
export const damageEnemyHere = (
  state: GameState,
  investigator: InvestigatorId,
  amount: number,
): Message[] =>
  ask(
    investigator,
    enemiesHere(state, investigator).map((enemy): Choice => ({
      label: 'choice.enemy',
      params: { enemy: enemy.name },
      target: { type: 'enemy', id: enemy.id },
      then: [{ type: 'DamageEnemy', enemy: enemy.id, amount, by: investigator }],
    })),
  )

/** Connecting locations, optionally filtered. */
export const connecting = (
  state: GameState,
  investigator: InvestigatorId,
  allowed: (location: string) => boolean = () => true,
): string[] => {
  const here = getInvestigator(state, investigator).location
  return here === null
    ? []
    : getLocation(state, here).connections.filter((to) => state.locations[to] && allowed(to))
}

/** Move to one of the given locations (asked when there is a choice). */
export const moveTo = (investigator: InvestigatorId, state: GameState, to: string[]): Message[] =>
  ask(
    investigator,
    to.map((location): Choice => ({
      label: 'action.move',
      params: { location: getLocation(state, location).name },
      target: { type: 'location', id: location },
      then: [{ type: 'MoveTo', investigator, location }],
    })),
  )
