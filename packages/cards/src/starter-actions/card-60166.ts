import { registerBasicEvent } from '../basic-events/register'
// Stakeout (0): investigate at +2; on success heal 1 horror.
registerBasicEvent('60166', {
  action: 'investigate',
  modifier: 2,
  tags: ['tactic'],
  onSuccess: ({ investigator }) => [{ type: 'Heal', investigator, damage: 0, horror: 1 }],
})
