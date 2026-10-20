import { registerPlayerCard } from '@lcg/engine'
// RR: Resolving Abilities. Resource gain and draw are sequential effects.
registerPlayerCard({
  code: '02194',
  play: (_state, investigator) => [
    { type: 'GainResources', investigator, amount: 3 },
    { type: 'DrawCards', investigator, amount: 1 },
  ],
})
