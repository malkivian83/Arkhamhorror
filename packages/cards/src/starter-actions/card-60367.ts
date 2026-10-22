import { registerBasicEvent } from '../basic-events/register'
// A Sudden Fall (0): fight at +2; +1 damage against an exhausted enemy.
registerBasicEvent('60367', {
  action: 'fight',
  modifier: 2,
  extraDamage: (_ctx, enemy) => (enemy.exhausted ? 1 : 0),
  tags: ['tactic', 'trick'],
})
