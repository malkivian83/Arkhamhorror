import { type Message } from '@lcg/engine'
import { elite, returnAtEndOfTurn, registerBasicEvent, skillValue } from './register'
// Slip Away (0, 2): add your intellect; by 2 (level 2: by 1) a non-Elite enemy does not
// ready in the next upkeep phase; level 2 returns to hand at the end of your turn by 3.
for (const [codes, keepBy, returnBy] of [
  [['04232', '60314'], 2, null],
  [['60324'], 1, 3],
] as const)
  for (const code of codes)
    registerBasicEvent(code, {
      action: 'evade',
      modifier: ({ state, investigator }) => skillValue(state, investigator, 'intellect'),
      tags: ['trick'],
      onSuccess: ({ investigator }, enemy) => [
        ...(elite(enemy!)
          ? []
          : [
              {
                type: 'IfTestResult',
                atLeast: keepBy,
                then: [{ type: 'EnemyStaysExhausted', enemy: enemy!.id }],
              } as Message,
            ]),
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
