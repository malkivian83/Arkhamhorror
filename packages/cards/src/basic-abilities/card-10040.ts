import { getInvestigator, type Message } from '@lcg/engine'
import { registerBasicAsset } from './register'
// Chemistry Set: exact margins decide the effect (fail by 2, succeed by 0, 2 or 4).
registerBasicAsset('10040', [
  {
    action: 'investigate',
    cost: ['exhaust'],
    after: ({ state, self, investigator }) => {
      const here = getInvestigator(state, investigator).location!
      const exactly = (margin: number, then: Message): Message => ({
        type: 'IfTestResult',
        exactly: margin,
        then: [then],
      })
      return [
        exactly(-2, { type: 'DiscardAsset', asset: self.id }),
        exactly(0, { type: 'GainResources', investigator, amount: 2 }),
        exactly(2, { type: 'DrawCards', investigator, amount: 1 }),
        exactly(4, { type: 'DiscoverClues', investigator, amount: 1, location: here }),
      ]
    },
  },
])
