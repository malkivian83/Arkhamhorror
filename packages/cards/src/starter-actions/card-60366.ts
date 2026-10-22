import { elite, registerBasicEvent } from '../basic-events/register'
// Quick Exit (0): evade at +2; by 2 or more a non-Elite enemy does not ready next upkeep.
registerBasicEvent('60366', {
  action: 'evade',
  modifier: 2,
  tags: ['tactic', 'trick'],
  onSuccess: (_ctx, enemy) =>
    elite(enemy!)
      ? []
      : [
          {
            type: 'IfTestResult',
            atLeast: 2,
            then: [{ type: 'EnemyStaysExhausted', enemy: enemy!.id }],
          },
        ],
})
