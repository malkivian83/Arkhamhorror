import { getInvestigator } from '@lcg/engine'
import { registerBasicAsset } from './register'
// Suggestion (1): add your willpower to the evasion; unless it succeeds by 2, remove a
// charge. It is discarded without charges.
registerBasicAsset(
  '52006',
  [
    {
      action: 'evade',
      cost: ['exhaust'],
      modifier: ({ state, investigator }) => getInvestigator(state, investigator).skills.willpower,
      available: ({ self }) => self.uses > 0,
      after: ({ self }) => [
        {
          type: 'IfTestResult',
          below: 2,
          then: [{ type: 'RemoveUses', asset: self.id, amount: 1 }],
        },
      ],
    },
  ],
  () => ({ discardWhenEmpty: true }),
)
