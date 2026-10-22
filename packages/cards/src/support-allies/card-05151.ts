import { registerPlayerCard } from '@lcg/engine'
import { cardName, damageEnemyHere, enemiesHere } from './register'
// Alice Luxley: +1 intellect. After you discover a clue, exhaust her: deal 1 damage to an
// enemy at your location.
registerPlayerCard({
  code: '05151',
  skillModifier: (_s, _self, test) => (test.skill === 'intellect' ? 1 : 0),
  reactions: (s, trigger, self) =>
    trigger.type !== 'afterDiscoverClues' ||
    trigger.investigator !== self.owner ||
    (trigger.amount ?? 1) < 1 ||
    self.exhausted ||
    !enemiesHere(s, self.owner).length
      ? []
      : [
          {
            key: self.id + ':damage',
            investigator: self.owner,
            label: 'ability.supportAliceDamage',
            params: { card: cardName('05151') },
            then: [{ type: 'ExhaustAsset', asset: self.id }, ...damageEnemyHere(s, self.owner, 1)],
          },
        ],
})
