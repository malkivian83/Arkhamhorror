// RR: Fight; Enemy Attacks ("when ... attacks you", before resolving it) in the enemy phase.
import { playerCardDef } from '@lcg/engine'
import { registerBasicAsset } from '../basic-abilities/register'
const code = '53002'
registerBasicAsset(code, [{ action: 'fight', modifier: 2 }], () => ({
  reactions: (s, trigger, self) => {
    if (
      trigger.type !== 'whenEnemyAttacks' ||
      trigger.investigator !== self.owner ||
      s.phase !== 'enemy' ||
      self.exhausted ||
      s.canceledAttack === trigger.enemy
    )
      return []
    const enemy = s.enemies[trigger.enemy]
    if (!enemy) return []
    return [
      {
        key: self.id + ':riposte',
        investigator: self.owner,
        label: 'ability.supportSurvivalKnife',
        params: { card: playerCardDef(code)!.name, enemy: enemy.name },
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
