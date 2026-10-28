import { registerPlayerCard, registerPlayerCards } from '@lcg/engine'
import { B } from './altar-codes'
registerPlayerCards([
  {
    code: B.zebulon,
    name: 'Zebulon Whateley',
    type: 'asset',
    class: 'neutral',
    story: true,
    unique: true,
    cost: 3,
    slots: ['ally'],
    traits: ['Ally', 'Dunwich'],
    health: 1,
    sanity: 4,
    icons: { willpower: 1, wild: 1 },
  },
])
registerPlayerCard({
  code: B.zebulon,
  skillModifier: (_s, _a, t) => (t.skill === 'willpower' ? 1 : 0),
  reactions: (s, t, a) =>
    t.type === 'afterSkillTest' &&
    t.investigator === a.owner &&
    t.succeeded &&
    !a.exhausted &&
    s.skillTest?.skill === 'willpower' &&
    s.skillTest.tags?.includes('treachery')
      ? [
          {
            key: `${a.id}:draw`,
            investigator: a.owner,
            label: 'ability.altar.zebulon',
            then: [
              { type: 'ExhaustAsset', asset: a.id },
              { type: 'DrawCards', investigator: a.owner, amount: 1 },
            ],
          },
        ]
      : [],
})
