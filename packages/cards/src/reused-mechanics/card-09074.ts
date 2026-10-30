import { type Message } from '@lcg/engine'
import { registerBasicEvent, returnAtEndOfTurn, skillValue } from '../basic-events/register'
import { chooseEnemyHere } from '../core-2026/investigators'
// RR: Investigate; Evade (automatic); Attacks of Opportunity. Breaking and Entering (2): add
// your [agility] to the investigation. By 1 or more you may automatically evade an enemy at
// this location; by 3 or more it returns to your hand at the end of your turn.
const code = '09074'
registerBasicEvent(
  code,
  {
    action: 'investigate',
    modifier: ({ state, investigator }) => skillValue(state, investigator, 'agility'),
    tags: ['trick'],
    onSuccess: ({ state, investigator }) => [
      {
        type: 'IfTestResult',
        atLeast: 1,
        then: chooseEnemyHere(
          state,
          investigator,
          'prompt.autoEvade',
          (e) => [{ type: 'EvadeEnemy', enemy: e.id, by: investigator }],
          true,
        ),
      } as Message,
      { type: 'IfTestResult', atLeast: 3, then: [returnAtEndOfTurn(investigator, code)] },
    ],
  },
  { noAttacksOfOpportunity: true },
)
