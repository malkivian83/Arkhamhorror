import { mayChoose } from '../core-2026/player-cards'
import { continuation } from '../dunwich-pilot/effects'
import { basicTest, registerBasicEvent, type BasicEvent } from './register'
const second: BasicEvent = {
  action: 'fight',
  modifier: 2,
  extraDamage: 1,
  tags: ['spirit', 'tactic'],
}
// One-Two Punch (0): +1; on success you may fight that enemy again at +2 and +1 damage,
// after the first attack has fully resolved and only if the enemy is still in play.
registerBasicEvent(
  '60117',
  {
    action: 'fight',
    modifier: 1,
    tags: ['spirit', 'tactic'],
    onSuccess: ({ investigator }, enemy) => [
      {
        type: 'AfterCurrentSkillTest',
        then: [continuation('60117', investigator, 'again', { enemy: enemy!.id })],
      },
    ],
  },
  {
    effect: (state, investigator, _step, data) => {
      const enemy = state.enemies[String(data.enemy)]
      if (!enemy) return []
      return [
        mayChoose(investigator, 'choice.fightAgain', { enemy: enemy.name }, [
          basicTest(second, { state, investigator, code: '60117' }, enemy),
        ]),
      ]
    },
  },
)
