import { registerBasicEvent } from '../basic-events/register'
// "I've got a plan!" (2): fight with intellect at +2; +1 damage per clue you have (max +3).
registerBasicEvent('60225', {
  action: 'fight',
  skill: 'intellect',
  modifier: 2,
  fight: { damageFromClues: 3 },
  tags: ['insight', 'tactic'],
})
