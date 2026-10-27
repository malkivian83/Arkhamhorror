import { registerPlayerCard, registerPlayerCards } from '@lcg/engine'
import { M } from './museum-codes'
registerPlayerCards([
  {
    code: M.adam,
    name: 'Adam Lynch',
    type: 'asset',
    class: 'neutral',
    story: true,
    unique: true,
    cost: 0,
    traits: ['Ally', 'Miskatonic'],
    health: 1,
    sanity: 1,
  },
])
registerPlayerCard({
  leavesPlay: (_s, a) => [
    { type: 'RemoveAssetFromGame', asset: a.id, leavingResolved: true },
    { type: 'AddChaosTokens', tokens: ['tablet'] },
  ],
  code: M.adam,
})
