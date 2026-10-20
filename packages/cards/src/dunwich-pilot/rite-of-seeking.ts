import { getInvestigator, getLocation, registerPlayerCard, shroudOf } from '@lcg/engine'
import { cardName } from './effects'
// RR ST.3 / ST.8. The delayed end is once, after results, even when success effects repeat.
registerPlayerCard({
  code: '02028',
  abilities: (state, self, investigator) => {
    const here = getInvestigator(state, investigator).location
    return here === null || self.uses < 1
      ? []
      : [
          {
            key: `${self.id}:investigate`,
            label: 'ability.investigateWith',
            params: { card: cardName(self.code), skill: 'willpower' },
            actions: 1 + (getLocation(state, here).investigateExtraActions ?? 0),
            provokes: true,
            costs: [{ type: 'SpendUses', asset: self.id, amount: 1 }],
            then: [
              {
                type: 'BeginSkillTest',
                investigator,
                source: self.id,
                skill: 'willpower',
                difficulty: shroudOf(state, here),
                tags: ['spell'],
                kind: { type: 'investigate', location: here, extraClues: 1 },
              },
            ],
          },
        ]
  },
  onTokenRevealed: (state, token, self) =>
    ['skull', 'cultist', 'tablet', 'elderThing', 'autoFail'].includes(String(token)) &&
    !state.skillTest?.tokenAfter?.some(
      (m) => m.type === 'EndCurrentTurn' && m.investigator === self.owner,
    )
      ? [{ type: 'ModifySkillTest', after: [{ type: 'EndCurrentTurn', investigator: self.owner }] }]
      : [],
})
