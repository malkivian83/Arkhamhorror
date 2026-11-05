import { turnActionTiming, type TreacheryBehavior } from '@lcg/engine'

export const action: TreacheryBehavior['revelation'] = (state, investigator) => [
  {
    type: turnActionTiming(state, investigator) ? 'LoseActions' : 'LoseNextTurnActions',
    investigator,
    amount: 1,
  },
]
