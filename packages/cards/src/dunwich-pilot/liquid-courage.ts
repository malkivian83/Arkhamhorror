import { registerPlayerCard } from '@lcg/engine'
import { atLocation } from './helpers'
import { cardName } from './effects'
// RR: Healing; Skill Tests. The chosen investigator, not the controller, performs the test.
registerPlayerCard({
  code: '02024',
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
                  onSuccess: [{ type: 'Heal', investigator: i.id, damage: 0, horror: 1 }],
                  onFail: [{ type: 'DiscardRandomFromHand', investigator: i.id, amount: 1 }],
                  onFailEach: [],
                },
              },
            ],
          })),
})
