import { registerBasicAsset } from './register'
// Song of the Dead (2): +2 damage if a skull is revealed during the attack.
registerBasicAsset('02112', [
  {
    action: 'fight',
    skills: ['willpower'],
    cost: ['use'],
    modifier: 1,
    fight: { damageIfTokens: { tokens: ['skull'], amount: 2 } },
  },
])
