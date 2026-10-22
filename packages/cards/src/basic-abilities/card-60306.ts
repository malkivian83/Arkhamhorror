import { playerCardDef, type InvestigatorId, type Message } from '@lcg/engine'
import { registerBasicAsset } from './register'
const ready = (asset: string): Message => ({ type: 'ReadyAsset', asset })
const gain = (investigator: InvestigatorId): Message => ({
  type: 'GainResources',
  investigator,
  amount: 1,
})
const either = (investigator: InvestigatorId, asset: string, code: string): Message => ({
  type: 'Ask',
  investigator,
  question: {
    kind: 'chooseOne',
    prompt: 'prompt.optional',
    choices: [
      {
        label: 'choice.readyAsset',
        params: { card: playerCardDef(code)!.name },
        then: [ready(asset)],
      },
      { label: 'choice.gainResource', then: [gain(investigator)] },
    ],
  },
})
// Mauser C96 (0, 2): success by 2 readies it or gains 1 resource; level 2 does both by 4.
for (const [code, bonus, both] of [
  ['60306', 1, false],
  ['60321', 2, true],
] as const)
  registerBasicAsset(code, [
    {
      action: 'fight',
      cost: ['exhaust', 'use'],
      modifier: bonus,
      extraDamage: 1,
      onSuccess: ({ investigator, self }) => [
        {
          type: 'IfTestResult',
          atLeast: 2,
          ...(both ? { below: 4 } : {}),
          then: [either(investigator, self.id, code)],
        },
        ...(both
          ? [
              {
                type: 'IfTestResult' as const,
                atLeast: 4,
                then: [ready(self.id), gain(investigator)],
              },
            ]
          : []),
      ],
    },
  ])
