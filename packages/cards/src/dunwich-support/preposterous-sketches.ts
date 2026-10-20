import { getInvestigator, registerPlayerCard } from '@lcg/engine'
// RR: Play Restrictions; Draw. Check the location, not clues held by the investigator.
registerPlayerCard({
  code: '02186',
  canPlay: (state, investigator) => {
    const here = getInvestigator(state, investigator).location
    return here !== null && (state.locations[here]?.clues ?? 0) > 0
  },
  play: (_state, investigator) => [{ type: 'DrawCards', investigator, amount: 3 }],
})
