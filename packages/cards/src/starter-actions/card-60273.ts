import { registerBasicEvent } from '../basic-events/register'
import { clues } from './register'
// Caustic Reaction (2): fight with intellect at +2 and +1 damage (+2 with 2+ clues).
registerBasicEvent('60273', {
  action: 'fight',
  skill: 'intellect',
  modifier: 2,
  extraDamage: ({ state, investigator }) => (clues(state, investigator) >= 2 ? 2 : 1),
  tags: ['tactic', 'science'],
})
