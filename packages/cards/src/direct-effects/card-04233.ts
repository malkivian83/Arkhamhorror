import { getInvestigator, registerPlayerCard } from '@lcg/engine'
import { endIfYourTurn } from './register'
// Pay Day (1): gain 1 resource per action you performed this turn (including this one);
// if it is your turn, end your turn.
registerPlayerCard({
  code: '04233',
  play: (s, by) => [
    { type: 'GainResources', investigator: by, amount: getInvestigator(s, by).actionsTaken ?? 0 },
    ...endIfYourTurn(s, by),
  ],
})
