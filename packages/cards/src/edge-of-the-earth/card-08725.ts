import type { TreacheryBehavior } from '@lcg/engine'

export const discard: TreacheryBehavior['revelation'] = (_state, investigator) => [
  { type: 'DiscardRandomFromHand', investigator, amount: 1 },
]
