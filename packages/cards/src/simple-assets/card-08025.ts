import { type Choice } from '@lcg/engine'
import { registerBasicAsset } from '../basic-abilities/register'
import { skillValue } from '../basic-events/register'
import { attackable } from '../core-2026/player-cards'
import { ask, continuation } from '../dunwich-pilot/effects'
// Butterfly Swords (2): fight at +1. After this attack, you may exhaust Butterfly Swords
// to fight again (any enemy you could attack), adding your agility, for +1 damage.
registerBasicAsset(
  '08025',
  [
    {
      action: 'fight',
      modifier: 1,
      after: ({ self, investigator }) => [
        {
          type: 'AfterCurrentSkillTest',
          then: [continuation('08025', investigator, 'again', { asset: self.id })],
        },
      ],
    },
  ],
  () => ({
    effect: (s, by, _step, data) => {
      const self = s.assets[String(data.asset)]
      if (!self || self.exhausted || self.owner !== by || !attackable(s, by).length) return []
      return ask(
        by,
        [
          ...attackable(s, by).map((enemy): Choice => ({
            label: 'choice.fightAgain',
            params: { enemy: enemy.name },
            target: { type: 'enemy', id: enemy.id },
            then: [
              { type: 'ExhaustAsset', asset: self.id },
              {
                type: 'BeginSkillTest',
                investigator: by,
                skill: 'combat',
                difficulty: enemy.fight,
                modifier: skillValue(s, by, 'agility'),
                source: self.id,
                kind: { type: 'fight', enemy: enemy.id, extraDamage: 1 },
              },
            ],
          })),
          { label: 'choice.skip', then: [] },
        ],
        true,
      )
    },
  }),
)
