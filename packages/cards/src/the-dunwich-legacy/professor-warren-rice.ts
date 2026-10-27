import { registerPlayerCards, registerPlayerCard } from '@lcg/engine'
import { EA } from './extracurricular-codes'
registerPlayerCards([
  {
    code: EA.rice,
    name: 'Professor Warren Rice',
    type: 'asset',
    class: 'neutral',
    story: true,
    unique: true,
    cost: 3,
    slots: ['ally'],
    traits: ['Ally', 'Miskatonic'],
    health: 2,
    sanity: 3,
    icons: { intellect: 1, wild: 1 },
  },
])
registerPlayerCard({
  code: EA.rice,
  skillModifier: (_state, _self, test) => (test.skill === 'intellect' ? 1 : 0),
  reactions: (_state, trigger, self) =>
    trigger.type === 'afterDiscoverClues' &&
    trigger.investigator === self.owner &&
    trigger.last &&
    !self.exhausted
      ? [
          {
            key: `${self.id}:draw`,
            investigator: self.owner,
            label: 'ability.dunwich.riceDraw',
            then: [
              { type: 'ExhaustAsset', asset: self.id },
              { type: 'DrawCards', investigator: self.owner, amount: 1 },
            ],
          },
        ]
      : [],
})
