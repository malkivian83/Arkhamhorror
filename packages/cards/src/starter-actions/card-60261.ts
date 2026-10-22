import { registerBasicEvent } from '../basic-events/register'
import { clues } from './register'
// Caustic Reaction (0): fight with intellect at +1; +1 damage while you control 2+ clues.
registerBasicEvent('60261', {
  action: 'fight',
  skill: 'intellect',
  modifier: 1,
  extraDamage: ({ state, investigator }) => (clues(state, investigator) >= 2 ? 1 : 0),
  tags: ['tactic', 'science'],
})
