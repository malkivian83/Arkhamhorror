import { dispatch, type GameState } from '@lcg/engine'
import { during } from '@lcg/engine/testing'
import { patch } from '../dunwich-pilot/testing'
import './index'

export { enemy, holding, play, resolve, sturdy } from '../basic-events/testing'
export { me } from '../dunwich-pilot/testing'

export const endTurn = (s: GameState) =>
  dispatch({ ...s, pending: null, queue: [] }, { type: 'EndTurn', investigator: 'a' })
/** Changes investigator "a" while the event waits in hand. */
export const set = (s: GameState, changes: Parameters<typeof patch>[0]) => during(s, patch(changes))
export const clues = (s: GameState, location: string, n: number) =>
  during(s, (x) => ({
    ...x,
    locations: {
      ...x.locations,
      [location]: { ...x.locations[location]!, revealed: true, clues: n },
    },
  }))
export const exhaust = (s: GameState) =>
  during(s, (x) => ({
    ...x,
    enemies: Object.fromEntries(
      Object.entries(x.enemies).map(([id, e]) => [id, { ...e, exhausted: true }]),
    ),
  }))
