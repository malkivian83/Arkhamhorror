import { registerPlayerCard, registerPlayerCards } from '@lcg/engine'
import { B } from './altar-codes'
registerPlayerCards([
  {
    code: B.earl,
    name: 'Earl Sawyer',
    type: 'asset',
    class: 'neutral',
    story: true,
    unique: true,
    cost: 3,
    slots: ['ally'],
    traits: ['Ally', 'Dunwich'],
    health: 3,
    sanity: 2,
    icons: { agility: 1, wild: 1 },
  },
])
registerPlayerCard({
  code: B.earl,
  skillModifier: (_s, _a, t) => (t.skill === 'agility' ? 1 : 0),
  reactions: (_s, t, a) =>
    t.type === 'afterEvade' && t.investigator === a.owner && !a.exhausted
      ? [
          {
            key: `${a.id}:draw`,
            investigator: a.owner,
            label: 'ability.altar.earl',
            then: [
              { type: 'ExhaustAsset', asset: a.id },
              { type: 'DrawCards', investigator: a.owner, amount: 1 },
            ],
          },
        ]
      : [],
})
