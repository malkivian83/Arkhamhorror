import { registerPlayerCard } from '@lcg/engine'

registerPlayerCard({
  code: '08737',
  removeAfterPlay: true,
  play: (_state, investigator) => [
    { type: 'GainResources', investigator, amount: 3 },
    { type: 'DrawCards', investigator, amount: 1 },
  ],
})
