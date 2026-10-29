// RR: Activate, Search, Draw. The selected investigator chooses the found card.
import { getInvestigator, investigatorsAt, registerPlayerCard } from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'
registerPlayerCard({
  code: '01031',
  abilities: (s, a, by) =>
    a.exhausted
      ? []
      : [
          {
            key: a.id + ':lore',
            label: 'ability.oldBookLore',
            actions: 1,
            provokes: true,
            costs: [{ type: 'ExhaustAsset', asset: a.id }],
            then: ask(
              by,
              investigatorsAt(s, getInvestigator(s, by).location!).map((i) => ({
                label: 'choice.investigator',
                params: { name: i.name },
                then: [
                  {
                    type: 'SearchDeck',
                    investigator: i.id,
                    top: 3,
                    traits: [],
                    anyCard: true,
                    includeWeaknesses: true,
                    to: 'hand',
                    drawFound: true,
                    optional: true,
                  },
                ],
              })),
              true,
            ),
          },
        ],
})
