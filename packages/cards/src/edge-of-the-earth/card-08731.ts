import { getInvestigator, registerPlayerCard } from '@lcg/engine'
import { ask, cardName } from '../dunwich-pilot/effects'

registerPlayerCard({
  code: '08731',
  abilities: (state, self, investigator) => {
    const { location } = getInvestigator(state, investigator)
    if (location === null || self.uses < 1) return []
    return [
      {
        key: `${self.id}:read`,
        label: 'ability.edgeOfTheEarth.memorialPoe',
        params: { card: cardName(self.code) },
        actions: 1,
        provokes: true,
        costs: [{ type: 'SpendUses', asset: self.id, amount: 1 }],
        then: ask(
          investigator,
          state.investigators
            .filter((target) => !target.eliminated && target.location === location)
            .map((target) => ({
              label: 'choice.investigator',
              params: { name: target.name },
              target: { type: 'investigator', id: target.id },
              then: [
                { type: 'SearchDeck', investigator: target.id, top: 6, traits: [], to: 'tekelili' },
                { type: 'DrawCards', investigator: target.id, amount: 1 },
              ],
            })),
        ),
      },
    ]
  },
})
