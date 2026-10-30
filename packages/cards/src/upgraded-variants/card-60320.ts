import { registerPlayerCard } from '@lcg/engine'
import { atLocation } from '../dunwich-pilot/helpers'
import { cardName } from '../dunwich-pilot/effects'
// RR: Activate Action; Uses; Healing; Skill Tests. The chosen investigator performs the test;
// success draws instead of healing, failure heals the extra horror and discards at random.
registerPlayerCard({
  code: '60320',
  abilities: (state, self, investigator) =>
    self.uses < 1
      ? []
      : atLocation(state, investigator)
          .filter((i) => i.horror > 0)
          .map((i) => ({
            key: `${self.id}:heal:${i.id}`,
            label: 'ability.pilotCourage',
            params: { name: i.name },
            target: { type: 'investigator', id: i.id },
            actions: 1,
            provokes: true,
            costs: [{ type: 'SpendUses', asset: self.id, amount: 1 }],
            then: [
              { type: 'Heal', investigator: i.id, damage: 0, horror: 1 },
              {
                type: 'BeginSkillTest',
                investigator: i.id,
                source: self.id,
                skill: 'willpower',
                difficulty: 2,
                kind: {
                  type: 'effect',
                  source: cardName(self.code),
                  onSuccess: [{ type: 'DrawCards', investigator: i.id, amount: 1 }],
                  onFail: [
                    { type: 'Heal', investigator: i.id, damage: 0, horror: 1 },
                    { type: 'DiscardRandomFromHand', investigator: i.id, amount: 1 },
                  ],
                  onFailEach: [],
                },
              },
            ],
          })),
})
