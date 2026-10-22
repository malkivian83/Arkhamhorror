import { registerBasicAsset } from './register'
// Disguise: +2 evasion; a non-Elite evaded enemy does not ready in the next upkeep phase.
registerBasicAsset('09062', [
  {
    action: 'evade',
    cost: ['use'],
    modifier: 2,
    onSuccess: (_ctx, enemy) =>
      enemy!.traits?.includes('Elite') ? [] : [{ type: 'EnemyStaysExhausted', enemy: enemy!.id }],
  },
])
