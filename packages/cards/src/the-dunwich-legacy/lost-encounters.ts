import { type EncounterLocationCard, type LocationCard } from '@lcg/engine'
import { copies, treachery } from '../scenario-helpers'
import { L } from './lost-codes'
import { interstellarTraveler } from './interstellar-traveler'
import { yithianStarseeker } from './yithian-starseeker'
import './collapsing-reality'
import './wormhole'
import './vast-expanse'
const room = (
  id: string,
  name: string,
  shroud: number,
  clues: number,
  per: boolean,
  symbol: string,
  connectsTo: string[],
): LocationCard => ({
  id,
  name,
  shroud,
  clueValue: clues,
  cluesPerInvestigator: per,
  symbol,
  connectsTo,
  connections: [],
})
export const LOST_LOCATIONS = [
  room(L.another, 'Another Dimension', 6, 0, false, 'circle', ['square', 'diamond', 'triangle']),
  room(L.edge, 'The Edge of the Universe', 2, 2, true, 'moon', ['cross', 'slash']),
  room(L.time, 'Tear Through Time', 2, 2, true, 'moon', ['circle', 'cross', 'slash']),
]
const single = (
  code: string,
  name: string,
  shroud: number,
  clues: number,
  per: boolean,
  symbol: string,
  to: string[],
  surge = false,
): EncounterLocationCard => {
  const { id: _id, ...location } = room(code, name, shroud, clues, per, symbol, to)
  return {
    ...location,
    kind: 'location',
    code,
    traits: ['Otherworld', 'Extradimensional'],
    keywords: surge ? ['surge'] : [],
  }
}
export const LOST_ENCOUNTER_LOCATIONS = [
  ...copies(
    single(
      L.space,
      'Tear Through Space',
      1,
      1,
      false,
      'square',
      ['diamond', 'triangle', 'square'],
      true,
    ),
    4,
  ),
  ...copies(single(L.cascade, 'Prismatic Cascade', 2, 3, false, 'diamond', ['square']), 2),
  ...copies(single(L.bridge, 'Endless Bridge', 4, 2, false, 'triangle', ['square']), 2),
  single(L.steps, "Steps of Y'hagharl", 3, 1, true, 'cross', ['diamond', 'moon']),
  single(L.doorway, 'Dimensional Doorway', 2, 1, true, 'slash', ['triangle', 'moon']),
]
export const LOST_ENCOUNTERS = [
  ...LOST_ENCOUNTER_LOCATIONS,
  ...copies(interstellarTraveler, 3),
  ...copies(yithianStarseeker, 2),
  ...copies(
    treachery({ code: L.collapsing, name: 'Collapsing Reality', traits: ['Hazard'], keywords: [] }),
    3,
  ),
  ...copies(treachery({ code: L.wormhole, name: 'Wormhole', traits: ['Hazard'], keywords: [] }), 2),
  ...copies(
    treachery({ code: L.expanse, name: 'Vast Expanse', traits: ['Terror'], keywords: [] }),
    3,
  ),
]
