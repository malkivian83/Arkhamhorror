import './pushed-into-the-beyond'
import './terror-from-beyond'
import './arcane-barrier'
import { copies, treachery } from '../scenario-helpers'
import { THE_BEYOND_CODES } from './beyond-codes'
export { THE_BEYOND_CODES } from './beyond-codes'

export const THE_BEYOND = [
  ...copies(
    treachery({
      code: THE_BEYOND_CODES.pushedIntoTheBeyond,
      name: 'Pushed into the Beyond',
      traits: ['Hex'],
      keywords: [],
    }),
    2,
  ),
  ...copies(
    treachery({
      code: THE_BEYOND_CODES.terrorFromBeyond,
      name: 'Terror from Beyond',
      traits: ['Hex', 'Terror'],
      keywords: ['peril'],
    }),
    2,
  ),
  ...copies(
    treachery({
      code: THE_BEYOND_CODES.arcaneBarrier,
      name: 'Arcane Barrier',
      traits: ['Hex', 'Obstacle'],
      keywords: [],
    }),
    2,
  ),
]
