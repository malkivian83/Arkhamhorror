import {
  getInvestigator,
  registerPlayerCard,
  registerPlayerCards,
  registerTreachery,
} from '@lcg/engine'
import { T } from './essex-codes'
import { trainSpecific, trainNeighbor } from './essex-helpers'
registerPlayerCards([
  {
    code: T.passenger,
    name: 'Helpless Passenger',
    type: 'asset',
    class: 'neutral',
    traits: ['Ally', 'Bystander'],
    story: true,
    cost: 0,
    health: 1,
    sanity: 1,
  },
])
registerTreachery({
  code: T.passenger,
  revelation: (s, investigator, self) => [
    trainSpecific('trainPassengerAppears', {
      investigator,
      treachery: self.id,
      location:
        trainNeighbor(s, getInvestigator(s, investigator).location ?? '', -1) ??
        getInvestigator(s, investigator).location ??
        '',
    }),
  ],
})
registerPlayerCard({
  code: T.passenger,
  leavesPlay: (_s, self, reason) => [
    trainSpecific('trainPassengerLeaves', {
      asset: self.id,
      exclude: reason === 'defeated' || reason === 'resigned' ? self.owner : '',
    }),
  ],
  placedAbilities: (_s, self, investigator) => [
    {
      key: `${self.id}:parley`,
      label: 'ability.essex.passenger',
      actions: 1,
      provokes: false,
      parley: true,
      then: [{ type: 'TakeControlOfPlaced', placed: self.id, investigator }],
    },
  ],
})
