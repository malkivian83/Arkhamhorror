import { getInvestigator, registerPlayerCard } from '@lcg/engine'
import { fightOptions } from './effects'
import { mayChoose } from '../core-2026/player-cards'
registerPlayerCard({
  code: '02036',
  abilities: (state, self, investigator) => fightOptions(state, self, investigator, 1),
  beforeResults: (state, test) =>
    test.succeeded && getInvestigator(state, test.investigator).actionsRemaining > 0
      ? [
          mayChoose(test.investigator, 'choice.pilotKukri', {}, [
            {
              type: 'SpendAdditionalAction',
              investigator: test.investigator,
              then: [{ type: 'ModifySkillTest', extraDamage: 1 }],
            },
          ]),
        ]
      : [],
})
