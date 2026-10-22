import { registerPlayerCard } from '@lcg/engine'
import { cardName } from './register'
// Jessica Hyde (1): +1 combat; enters play with 2 damage on her. After your turn ends,
// heal 1 damage from her.
registerPlayerCard({
  code: '06118',
  entersPlayWith: { damage: 2 },
  skillModifier: (_s, _self, test) => (test.skill === 'combat' ? 1 : 0),
  reactions: (_s, trigger, self) =>
    trigger.type !== 'turnEnds' || trigger.investigator !== self.owner || self.damage < 1
      ? []
      : [
          {
            key: self.id + ':heal',
            investigator: self.owner,
            label: 'ability.supportJessicaHeal',
            params: { card: cardName('06118') },
            then: [{ type: 'HealAsset', asset: self.id, damage: 1, horror: 0 }],
          },
        ],
})
