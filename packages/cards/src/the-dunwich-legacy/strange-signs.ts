import { getInvestigator, registerTreachery } from '@lcg/engine'
import { effectTest } from '../scenario-helpers'
import { B } from './altar-codes'
registerTreachery({
  code: B.signs,
  revelation: (s, i) => [
    effectTest(i, 'Strange Signs', 'intellect', 3, {
      onFail: [
        {
          type: 'PlaceCluesOnLocationFromPool',
          location: getInvestigator(s, i).location!,
          amount: s.investigators.length >= 3 ? 2 : 1,
        },
      ],
    }),
  ],
})
