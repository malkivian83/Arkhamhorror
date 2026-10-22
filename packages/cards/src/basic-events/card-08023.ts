import { registerBasicEvent, skillValue } from './register'
// Sweeping Kick (1): add your agility, +1 damage; a success also evades the attacked enemy.
registerBasicEvent('08023', {
  action: 'fight',
  modifier: ({ state, investigator }) => skillValue(state, investigator, 'agility'),
  extraDamage: 1,
  tags: ['spirit', 'tactic', 'trick'],
  onSuccess: ({ investigator }, enemy) => [
    { type: 'EvadeEnemy', enemy: enemy!.id, by: investigator },
  ],
})
