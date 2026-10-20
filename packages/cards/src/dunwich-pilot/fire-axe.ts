import { getInvestigator, registerPlayerCard } from '@lcg/engine'
import { fightOptions } from './effects'
registerPlayerCard({
  code: '02032',
  abilities: (state, self, investigator) =>
    fightOptions(state, self, investigator, 0, { damageIfNoResources: 1 }),
  testOptions: (state, test, self) =>
    test.source === self.id &&
    test.kind.type === 'fight' &&
    getInvestigator(state, self.owner).resources > 0 &&
    (test.abilityCounts?.[self.id] ?? 0) < 3
      ? [
          {
            key: `${self.id}:pump`,
            investigator: self.owner,
            label: 'ability.pilotAxe',
            then: [
              { type: 'SpendResources', investigator: self.owner, amount: 1 },
              { type: 'ModifySkillTest', use: self.id },
              { type: 'BoostSkillTest', amount: 2 },
            ],
          },
        ]
      : [],
})
