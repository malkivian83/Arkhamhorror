import { registerPlayerCard, scenarioBehavior } from '@lcg/engine'

registerPlayerCard({
  code: '08733',
  canPlay: (state, investigator) =>
    !scenarioBehavior(state.scenarioId)?.cannotDrawCards?.(state, investigator),
  play: (_state, investigator) => [{ type: 'DrawCards', investigator, amount: 3 }],
})
