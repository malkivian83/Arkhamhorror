import { registerPlayerCard } from '@lcg/engine'
import { cardName, damageEnemyHere, enemiesHere } from './register'
// Brother Xavier (1): +1 willpower; may take damage and horror dealt to other investigators
// at your location. When he is defeated, deal 2 damage to an enemy at your location.
registerPlayerCard({
  code: '02106',
  soaksForOthers: true,
  skillModifier: (_s, _self, test) => (test.skill === 'willpower' ? 1 : 0),
  reactions: (s, trigger, self) =>
    trigger.type !== 'assetDefeated' ||
    trigger.asset.id !== self.id ||
    !enemiesHere(s, self.owner).length
      ? []
      : [
          {
            key: self.id + ':defeated',
            investigator: self.owner,
            label: 'ability.supportXavier',
            params: { card: cardName('02106') },
            then: damageEnemyHere(s, self.owner, 2),
          },
        ],
})
