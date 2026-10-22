import { registerBasicEvent } from '../basic-events/register'
import { clues } from './register'
// Unflappable (0): evade at +2; on success, with 2+ clues, heal 1 horror.
registerBasicEvent('60262', {
  action: 'evade',
  modifier: 2,
  tags: ['insight'],
  onSuccess: ({ state, investigator }) =>
    clues(state, investigator) >= 2 ? [{ type: 'Heal', investigator, damage: 0, horror: 1 }] : [],
})
