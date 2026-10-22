import { registerBasicAsset } from '../basic-abilities/register'
import { cardName } from './register'
// Survival Knife: fight at +1. After an enemy attack deals damage to you during the enemy
// phase, exhaust it to fight that enemy at +2 for +1 damage.
registerBasicAsset('04017', [{ action: 'fight', modifier: 1 }], () => ({
  reactions: (s, trigger, self) => {
    if (
      trigger.type !== 'afterTakeDamage' ||
      trigger.investigator !== self.owner ||
      !trigger.enemy ||
      trigger.damage < 1 ||
      s.phase !== 'enemy' ||
      self.exhausted
    )
      return []
    const enemy = s.enemies[trigger.enemy]
    if (!enemy) return []
    return [
      {
        key: self.id + ':riposte',
        investigator: self.owner,
        label: 'ability.supportSurvivalKnife',
        params: { card: cardName('04017'), enemy: enemy.name },
        target: { type: 'enemy', id: enemy.id },
        then: [
          { type: 'ExhaustAsset', asset: self.id },
          {
            type: 'BeginSkillTest',
            investigator: self.owner,
            skill: 'combat',
            difficulty: enemy.fight,
            modifier: 2,
            source: self.id,
            kind: { type: 'fight', enemy: enemy.id, extraDamage: 1 },
          },
        ],
      },
    ]
  },
}))
