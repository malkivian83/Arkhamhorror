import { registerPlayerCard, registerPlayerCards } from '@lcg/engine'
import { M } from './museum-codes'
registerPlayerCards([
  {
    code: M.necronomicon,
    name: 'The Necronomicon',
    type: 'asset',
    class: 'neutral',
    story: true,
    unique: true,
    cost: 2,
    traits: ['Item', 'Tome'],
    slots: ['hand'],
    icons: { intellect: 1 },
  },
])
registerPlayerCard({
  code: M.necronomicon,
  skillModifier: (_s, _a, test) => (test.skill === 'intellect' ? 1 : 0),
  abilities: (_s, self) => [
    {
      key: `${self.id}:resources`,
      label: 'ability.museum.resources',
      actions: 1,
      provokes: true,
      then: [{ type: 'GainResources', investigator: self.owner, amount: 2 }],
    },
  ],
})
