import { type Choice, type Message } from '@lcg/engine'
import { registerBasicAsset } from '../basic-abilities/register'
import { skillValue } from '../basic-events/register'
import { attackable } from '../core-2026/player-cards'
import { ask, continuation } from '../dunwich-pilot/effects'
// RR: Fight; ST.6 "when you would succeed". Butterfly Swords (5): fight at +2. After this
// attack you may fight again (no exhaust), adding your agility. If both attacks succeed, you may
// exhaust it when the second would succeed to have that attack deal +1 damage.
const code = '08030'
const BOTH = 'butterfly-swords-both'
const again = (investigator: string, asset: string, won: boolean): Message[] => [
  {
    type: 'AfterCurrentSkillTest',
    then: [continuation(code, investigator, 'again', { asset, won })],
  },
]
registerBasicAsset(
  code,
  [
    {
      action: 'fight',
      modifier: 2,
      onSuccess: ({ self, investigator }) => again(investigator, self.id, true),
      onFail: ({ self, investigator }) => again(investigator, self.id, false),
    },
  ],
  () => ({
    effect: (s, by, _step, data) => {
      const self = s.assets[String(data.asset)]
      if (!self || self.owner !== by || !attackable(s, by).length) return []
      return ask(
        by,
        [
          ...attackable(s, by).map((enemy): Choice => ({
            label: 'choice.fightAgain',
            params: { enemy: enemy.name },
            target: { type: 'enemy', id: enemy.id },
            then: [
              {
                type: 'BeginSkillTest',
                investigator: by,
                skill: 'combat',
                difficulty: enemy.fight,
                modifier: skillValue(s, by, 'agility'),
                source: self.id,
                ...(data.won ? { tags: [BOTH] } : {}),
                kind: { type: 'fight', enemy: enemy.id },
              },
            ],
          })),
          { label: 'choice.skip', then: [] },
        ],
        true,
      )
    },
    reactions: (s, trigger, self) =>
      trigger.type === 'whenWouldSucceed' &&
      trigger.investigator === self.owner &&
      !self.exhausted &&
      s.skillTest?.source === self.id &&
      s.skillTest.kind.type === 'fight' &&
      s.skillTest.tags?.includes(BOTH)
        ? [
            {
              key: self.id + ':both',
              investigator: self.owner,
              label: 'ability.butterflySwordsDamage',
              then: [
                { type: 'ExhaustAsset', asset: self.id },
                { type: 'ModifySkillTest', extraDamage: 1 },
              ],
            },
          ]
        : [],
  }),
)
