import { registerBasicEvent } from '../basic-events/register'
// Stakeout (3): investigate at +3; on success 1 additional clue and heal 2 horror.
registerBasicEvent('60179', {
  action: 'investigate',
  modifier: 3,
  extraClues: 1,
  tags: ['tactic'],
  onSuccess: ({ investigator }) => [{ type: 'Heal', investigator, damage: 0, horror: 2 }],
})
