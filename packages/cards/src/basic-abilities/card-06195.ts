import { GOOD_TOKENS, registerBasicAsset } from './register'
// .35 Winchester: +2 damage if a +1, 0 or elder sign token is revealed during the attack.
registerBasicAsset('06195', [
  {
    action: 'fight',
    cost: ['use'],
    modifier: 2,
    fight: { damageIfTokens: { tokens: GOOD_TOKENS, amount: 2 } },
  },
])
