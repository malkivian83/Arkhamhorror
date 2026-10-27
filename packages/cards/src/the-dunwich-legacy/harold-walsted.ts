import { registerPlayerCard, registerPlayerCards } from '@lcg/engine'
import { M } from './museum-codes'
registerPlayerCards([
  {
    code: M.harold,
    name: 'Harold Walsted',
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
  code: M.harold,
  skillModifier: (_s, _a, test) =>
    test.kind.type === 'investigate' &&
    Object.values(M).includes(test.kind.location as typeof M.entrance)
      ? 2
      : 0,
})
