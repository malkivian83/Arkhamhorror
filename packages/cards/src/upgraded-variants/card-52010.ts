// RR: Fight; Activate (discard or remove from the game as a cost); Discover Clues.
import { getInvestigator, playerCardDef, registerPlayerCard } from '@lcg/engine'
import { fightOptions } from '../dunwich-pilot/effects'
const code = '52010'
registerPlayerCard({
  code,
  abilities: (s, a, i) => {
    const here = getInvestigator(s, i).location
    const card = playerCardDef(code)!.name
    return [
      ...fightOptions(s, a, i, 2),
      ...(here !== null && (s.locations[here]?.clues ?? 0) > 0
        ? [
            {
              key: a.id + ':clue',
              label: 'ability.reactiveShovel',
              params: { card },
              actions: 1,
              provokes: true,
              costs: [{ type: 'DiscardAsset' as const, asset: a.id }],
              then: [
                { type: 'DiscoverClues' as const, investigator: i, location: here, amount: 1 },
              ],
            },
            {
              key: a.id + ':clues',
              label: 'ability.shovelRemove',
              params: { card },
              actions: 1,
              provokes: true,
              costs: [{ type: 'RemoveAssetFromGame' as const, asset: a.id }],
              then: [
                { type: 'DiscoverClues' as const, investigator: i, location: here, amount: 2 },
              ],
            },
          ]
        : []),
    ]
  },
})
