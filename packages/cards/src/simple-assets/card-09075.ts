import { registerBasicAsset } from '../basic-abilities/register'
// Thieves' Kit (3): spend 1 supply: investigate with intellect or agility at +1; on
// success gain 1 resource, or 2 when it succeeds by 2 or more.
registerBasicAsset('09075', [
  {
    action: 'investigate',
    skills: ['intellect', 'agility'],
    cost: ['use'],
    modifier: 1,
    onSuccess: ({ investigator }) => [
      { type: 'GainResources', investigator, amount: 1 },
      {
        type: 'IfTestResult',
        atLeast: 2,
        then: [{ type: 'GainResources', investigator, amount: 1 }],
      },
    ],
  },
])
