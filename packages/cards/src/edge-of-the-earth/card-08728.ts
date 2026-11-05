import type { TreacheryBehavior } from '@lcg/engine'

export const clue: TreacheryBehavior['revelation'] = (_state, investigator) => [
  { type: 'PlaceCluesOnLocation', investigator, amount: 1 },
]
