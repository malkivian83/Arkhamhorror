import { getInvestigator, registerPlayerCard } from '@lcg/engine'
import { chooseRole } from './roles'

// RR: Fast. Play only during your turn. Switch role; until the end of the turn the next
// card of the (new) role costs 3 less; draw 1 card.
registerPlayerCard({
  code: '03018',
  canPlay: (s, by) => s.activeTurn === by,
  play: (s, by) => [
    chooseRole(by, getInvestigator(s, by).role),
    { type: 'SetNextRoleDiscount', investigator: by, amount: 3 },
    { type: 'DrawCards', investigator: by, amount: 1 },
  ],
})
