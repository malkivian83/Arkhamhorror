import { type GameState } from '@lcg/engine'
import { during } from '@lcg/engine/testing'
import { patch } from '../dunwich-pilot/testing'
import './index'

export { enemy, fight, investigate, name, resolve, setup, sturdy } from '../basic-abilities/testing'
export { me, withAsset } from '../dunwich-pilot/testing'

/** Changes investigator "a" during the current window. */
export const set = (s: GameState, changes: Parameters<typeof patch>[0]) => during(s, patch(changes))
export const clues = (s: GameState, location: string, n: number) =>
  during(s, (x) => ({
    ...x,
    locations: {
      ...x.locations,
      [location]: { ...x.locations[location]!, revealed: true, clues: n },
    },
  }))
export const labels = (s: GameState) => s.pending?.question.choices.map((c) => c.label) ?? []
