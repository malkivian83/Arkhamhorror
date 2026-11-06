import { getInvestigator, registerPlayerCard, shroudOf, type Choice } from '@lcg/engine'
import { ask, cardName } from '../dunwich-pilot/effects'

registerPlayerCard({
  code: '08735',
  abilities: (state, self, investigator) => {
    const { location } = getInvestigator(state, investigator)
    if (location === null || self.uses < 1) return []
    return [
      {
        key: `${self.id}:investigate`,
        label: 'ability.investigateWith',
        params: { card: cardName(self.code) },
        actionKind: 'investigate',
        actions: 1,
        provokes: true,
        costs: [{ type: 'SpendUses', asset: self.id, amount: 1 }],
        then: ask(
          investigator,
          [true, false].map((replace): Choice => ({
            label: replace
              ? 'choice.edgeOfTheEarth.memorialBase'
              : 'choice.edgeOfTheEarth.memorialBoost',
            then: [
              {
                type: 'BeginSkillTest',
                investigator,
                skill: 'intellect',
                difficulty: shroudOf(state, location),
                ...(replace ? { baseSkill: 5 } : { modifier: 2 }),
                source: self.id,
                kind: { type: 'investigate', location, extraClues: 1 },
              },
            ],
          })),
        ),
      },
    ]
  },
})
