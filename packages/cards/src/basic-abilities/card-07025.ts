import { registerBasicAsset } from './register'
// .25 Automatic (0): Fast asset; the bonus applies only against an exhausted enemy.
registerBasicAsset('07025', [
  {
    action: 'fight',
    cost: ['use'],
    modifier: (_ctx, enemy) => (enemy?.exhausted ? 2 : 0),
    extraDamage: (_ctx, enemy) => (enemy.exhausted ? 1 : 0),
  },
])
