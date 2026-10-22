import { returnAtEndOfTurn, registerBasicEvent } from './register'
// Pilfer (0, 3): investigate with agility for 2 additional clues; level 3 returns to hand
// at the end of your turn when succeeding by 2.
registerBasicEvent('60315', {
  action: 'investigate',
  skill: 'agility',
  tags: ['trick'],
  extraClues: 2,
})
registerBasicEvent('60328', {
  action: 'investigate',
  skill: 'agility',
  tags: ['trick'],
  extraClues: 2,
  onSuccess: ({ investigator }) => [
    { type: 'IfTestResult', atLeast: 2, then: [returnAtEndOfTurn(investigator, '60328')] },
  ],
})
