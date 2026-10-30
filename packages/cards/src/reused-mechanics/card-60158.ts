import { registerPlayerCard } from '@lcg/engine'
import { cardName } from '../dunwich-pilot/effects'
// RR: Uses (ammo); Reactions; Fight. Service Revolver: after an enemy attacks you, spend 1 ammo
// to fight that enemy (combat) at +1 for +1 damage. The attack targets it wherever it is.
const code = '60158'
registerPlayerCard({
  code,
  reactions: (s, t, self) => {
    if (t.type !== 'afterEnemyAttack' || t.investigator !== self.owner || self.uses < 1) return []
    const enemy = s.enemies[t.enemy]
    if (!enemy) return []
    return [
      {
        key: self.id + ':revolver',
        investigator: self.owner,
        label: 'ability.supportSurvivalKnife',
        params: { card: cardName(code), enemy: enemy.name },
        target: { type: 'enemy', id: enemy.id },
        then: [
          { type: 'SpendUses', asset: self.id, amount: 1 },
          {
            type: 'BeginSkillTest',
            investigator: self.owner,
            skill: 'combat',
            difficulty: enemy.fight,
            modifier: 1,
            source: self.id,
            kind: { type: 'fight', enemy: enemy.id, extraDamage: 1 },
          },
        ],
      },
    ]
  },
})
