import type { TreacheryBehavior } from '@lcg/engine'

export const resources: TreacheryBehavior['revelation'] = (_state, investigator) => [
  { type: 'LoseResources', investigator, amount: 2 },
]
