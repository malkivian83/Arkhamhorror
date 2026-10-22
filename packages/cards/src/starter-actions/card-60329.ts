import { registerBasicEvent, returnAtEndOfTurn } from '../basic-events/register'
// Backstab (3): fight with agility for +2 damage; by 2 or more it returns to your hand
// at the end of your turn.
registerBasicEvent('60329', {
  action: 'fight',
  skill: 'agility',
  extraDamage: 2,
  tags: ['tactic'],
  onSuccess: ({ investigator }) => [
    { type: 'IfTestResult', atLeast: 2, then: [returnAtEndOfTurn(investigator, '60329')] },
  ],
})
