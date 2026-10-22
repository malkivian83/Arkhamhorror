import { type InvestigatorId, type Message } from '@lcg/engine'
import { registerBasicAsset } from './register'
const gain = (investigator: InvestigatorId, amount: number): Message => ({
  type: 'GainResources',
  investigator,
  amount,
})
// Burglary (0): instead of discovering clues, gain 3 resources.
registerBasicAsset(
  ['01045', '01545'],
  [
    {
      action: 'investigate',
      cost: ['exhaust'],
      replaceClue: true,
      onSuccess: ({ investigator }) => [gain(investigator, 3)],
    },
  ],
)
// Burglary (2): 2 resources, +1 per point succeeded by (up to +3), instead of clues.
registerBasicAsset('06200', [
  {
    action: 'investigate',
    cost: ['exhaust'],
    replaceClue: true,
    onSuccess: ({ investigator }) => [
      gain(investigator, 2),
      ...[1, 2, 3].map((atLeast): Message => ({
        type: 'IfTestResult',
        atLeast,
        then: [gain(investigator, 1)],
      })),
    ],
  },
])
