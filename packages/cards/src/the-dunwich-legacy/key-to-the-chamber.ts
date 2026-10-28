import {
  getInvestigator,
  registerPlayerCards,
  registerPlayerCard,
  registerTreachery,
} from '@lcg/engine'
import { B } from './altar-codes'
import { altarSpecific } from './altar-helpers'
registerPlayerCards([
  {
    code: B.key,
    name: 'Key to the Chamber',
    type: 'asset',
    class: 'neutral',
    cost: 0,
    story: true,
    traits: ['Item', 'Key'],
  },
])
registerPlayerCard({
  code: B.key,
  abilities: (s, self) =>
    s.locations[getInvestigator(s, self.owner).location ?? '']?.connections.includes(B.chamber)
      ? [
          {
            key: `${self.id}:unlock`,
            label: 'ability.altar.key',
            actions: 0,
            provokes: false,
            then: [altarSpecific('altarUnlock', { asset: self.id })],
          },
        ]
      : [],
})
registerTreachery({
  code: B.key,
  revelation: (_s, i, self) => [altarSpecific('altarKey', { investigator: i, treachery: self.id })],
})
