import { elite, registerBasicEvent, skillValue } from '../basic-events/register'
// Quick Exit (2): evade adding your willpower; a non-Elite enemy does not ready next upkeep.
registerBasicEvent('60377', {
  action: 'evade',
  modifier: ({ state, investigator }) => skillValue(state, investigator, 'willpower'),
  tags: ['tactic', 'trick'],
  onSuccess: (_ctx, enemy) =>
    elite(enemy!) ? [] : [{ type: 'EnemyStaysExhausted', enemy: enemy!.id }],
})
