// RR: Costs (cost reduction), Discover Clues. Extensive Research (1): each other card in hand
// reduces its cost by 1; like level 0 (60216), it is played only when there is a clue to find.
import { getInvestigator, registerPlayerCard } from '@lcg/engine'

const code = '06198'
registerPlayerCard({
  code,
  selfCostModifier: (s, by) =>
    -Math.max(
      0,
      getInvestigator(s, by).hand.length - Number(getInvestigator(s, by).hand.includes(code)),
    ),
  canPlay: (s, by) => {
    const location = getInvestigator(s, by).location
    return location !== null && s.locations[location]!.clues > 0
  },
  play: (_s, by) => [{ type: 'DiscoverClues', investigator: by, amount: 2 }],
})
