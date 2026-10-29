// RR: Draw, Effects. Count clues on resolution; maximum five.
import { getInvestigator, registerPlayerCard } from '@lcg/engine'
registerPlayerCard({
  code: '02008',
  play: (s, by) => [
    { type: 'DrawCards', investigator: by, amount: Math.min(5, getInvestigator(s, by).clues) },
  ],
})
