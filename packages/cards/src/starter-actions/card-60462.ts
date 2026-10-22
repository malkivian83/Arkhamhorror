import { registerBasicEvent } from '../basic-events/register'
import { heal, healStep } from './register'
// Consume Life (0): fight with willpower for +1 damage; if it defeats the enemy, heal
// 1 damage from an investigator or Ally asset at your location.
registerBasicEvent(
  '60462',
  {
    action: 'fight',
    skill: 'willpower',
    extraDamage: 1,
    tags: ['spell'],
    onSuccess: ({ investigator }, enemy) => [
      {
        type: 'AfterCurrentSkillTest',
        then: [
          {
            type: 'IfEnemyDefeated',
            enemy: enemy!.id,
            then: [heal('60462', investigator, 'damage', 1, 'location')],
          },
        ],
      },
    ],
  },
  { effect: (s, by, _step, data) => healStep(s, '60462', by, data) },
)
