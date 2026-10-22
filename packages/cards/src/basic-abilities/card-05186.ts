import { registerBasicAsset } from './register'
// .45 Thompson (Guardian): ammo spent from it goes to your resource pool.
registerBasicAsset('05186', [
  {
    action: 'fight',
    cost: ['use'],
    extraCosts: ({ investigator }) => [{ type: 'GainResources', investigator, amount: 1 }],
    modifier: 2,
    extraDamage: 1,
  },
])
