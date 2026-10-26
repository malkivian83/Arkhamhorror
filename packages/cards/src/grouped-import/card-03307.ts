import { getInvestigator, investigatorsAt, registerPlayerCard } from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'
// RR: Search, Draw, Fast, Player Windows. The selected investigator makes the search decision.
registerPlayerCard({
  code: '03307',
  playInAnyFastWindow: true,
  canPlay: (s, by) => {
    const here = getInvestigator(s, by).location
    return here !== null && investigatorsAt(s, here).some((i) => i.deck.length > 0)
  },
  play: (s, by) => {
    const here = getInvestigator(s, by).location
    return here === null
      ? []
      : ask(
          by,
          investigatorsAt(s, here)
            .filter((i) => i.deck.length > 0)
            .map((i) => ({
              label: 'choice.investigator',
              params: { name: i.name },
              target: { type: 'investigator', id: i.id },
              then: [
                {
                  type: 'SearchDeck',
                  investigator: i.id,
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
        )
  },
})
