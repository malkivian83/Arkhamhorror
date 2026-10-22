import { mayChoose } from '../core-2026/player-cards'
import { registerBasicAsset } from './register'
// Grim Memoir: +2 investigation; success by 2 or more may draw 1 card.
registerBasicAsset('09044', [
  {
    action: 'investigate',
    cost: ['use'],
    modifier: 2,
    onSuccess: ({ investigator }) => [
      {
        type: 'IfTestResult',
        atLeast: 2,
        then: [
          mayChoose(investigator, 'choice.drawCards', { n: 1 }, [
            { type: 'DrawCards', investigator, amount: 1 },
          ]),
        ],
      },
    ],
  },
])
