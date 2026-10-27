import { getInvestigator, skillValueFor, type Message } from '@lcg/engine'
import { registerBasicAsset } from './register'
// Lockpicks: add your agility value (with its constant modifiers) to the investigation. Unless
// it succeeds by 2, level 0 is discarded and level 1 loses a supply (and is discarded without
// supplies).
for (const [codes, penalty] of [
  [['60305', '60361'], 'discard'],
  [['03031', '01687', '60372'], 'supply'],
] as const)
  registerBasicAsset(
    [...codes],
    [
      {
        action: 'investigate',
        cost: ['exhaust'],
        modifier: ({ state, investigator }) =>
          skillValueFor(state, investigator, 'agility', {
            type: 'investigate',
            location: getInvestigator(state, investigator).location ?? '',
          }),
        after: ({ self }) => [
          {
            type: 'IfTestResult',
            below: 2,
            then: [
              penalty === 'discard'
                ? { type: 'DiscardAsset', asset: self.id }
                : ({ type: 'SpendUses', asset: self.id, amount: 1 } as Message),
            ],
          },
        ],
      },
    ],
    () => (penalty === 'supply' ? { discardWhenEmpty: true } : {}),
  )
