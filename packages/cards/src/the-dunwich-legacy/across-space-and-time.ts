import { registerPlayerCards, registerPlayerCard } from '@lcg/engine'
import { T } from './essex-codes'
registerPlayerCards([
  {
    code: T.across,
    name: 'Across Space and Time',
    type: 'treachery',
    class: 'neutral',
    traits: ['Madness'],
    story: true,
    weakness: 'story',
    cost: 0,
  },
])
registerPlayerCard({
  code: T.across,
  revelation: (_s, investigator) => [{ type: 'MillDeck', investigator, amount: 3 }],
})
