import { registerPlayerCards, registerPlayerCard, registerTreachery } from '@lcg/engine'
import { effectTest } from '../scenario-helpers'
import { EA } from './extracurricular-codes'
registerPlayerCards([
  {
    code: EA.jazz,
    name: '"Jazz" Mulligan',
    type: 'asset',
    class: 'neutral',
    story: true,
    unique: true,
    cost: 0,
    traits: ['Ally', 'Miskatonic'],
    health: 2,
    sanity: 2,
  },
])
registerTreachery({
  code: EA.jazz,
  revelation: (_state, investigator, self) => [
    { type: 'ScenarioSpecific', key: 'eaJazzAppears', data: { investigator, treachery: self.id } },
  ],
})
registerPlayerCard({
  code: EA.jazz,
  placedAbilities: (_state, self, investigator) => [
    {
      key: `${self.id}:parley`,
      label: 'ability.dunwich.parleyJazz',
      actions: 1,
      provokes: false,
      parley: true,
      then: [
        {
          ...effectTest(investigator, '"Jazz" Mulligan', 'intellect', 3, {
            onSuccess: [{ type: 'TakeControlOfPlaced', placed: self.id, investigator }],
          }),
          tags: ['scenario', 'parley'],
        },
      ],
    },
  ],
})
