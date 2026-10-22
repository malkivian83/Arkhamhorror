import { registerBasicEvent, skillValue } from '../basic-events/register'
// A Sudden Fall (2): fight with agility adding your combat; +2 damage against an exhausted enemy.
registerBasicEvent('60378', {
  action: 'fight',
  skill: 'agility',
  modifier: ({ state, investigator }) => skillValue(state, investigator, 'combat'),
  extraDamage: (_ctx, enemy) => (enemy.exhausted ? 2 : 0),
  tags: ['tactic', 'trick'],
})
