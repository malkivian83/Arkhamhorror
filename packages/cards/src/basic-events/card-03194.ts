import { type Message } from '@lcg/engine'
import { returnAtEndOfTurn, registerBasicEvent, skillValue } from './register'
// Cheap Shot (0, 2): add your agility; by 2 (level 2: by 1) evade the attacked enemy, and
// level 2 returns to hand at the end of your turn by 3.
for (const [codes, evadeBy, returnBy] of [
  [['03194', '60312'], 2, null],
  [['60323'], 1, 3],
] as const)
  for (const code of codes)
    registerBasicEvent(code, {
      action: 'fight',
      modifier: ({ state, investigator }) => skillValue(state, investigator, 'agility'),
      tags: ['trick'],
      onSuccess: ({ investigator }, enemy) => [
        {
          type: 'IfTestResult',
          atLeast: evadeBy,
          then: [{ type: 'EvadeEnemy', enemy: enemy!.id, by: investigator }],
        },
        ...(returnBy
          ? [
              {
                type: 'IfTestResult',
                atLeast: returnBy,
                then: [returnAtEndOfTurn(investigator, code)],
              } as Message,
            ]
          : []),
      ],
    })
