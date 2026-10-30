import { getInvestigator, registerPlayerCard, type Message } from '@lcg/engine'
import { reaction } from '../core-2026/cards'
import { cardName } from '../dunwich-pilot/effects'
// RR: Fast; Engaging; Reactions. Guard Dog (2): [fast] exhaust it to engage an enemy at your
// location, which then attacks you. When an enemy attack deals damage and/or horror to it, deal
// 1 damage to the attacking enemy.
const code = '09034'
registerPlayerCard({
  code,
  fastOptions: (s, self) => {
    const here = getInvestigator(s, self.owner).location
    if (self.exhausted || here === null) return []
    return Object.values(s.enemies)
      .filter((e) => e.location === here)
      .map((enemy) => ({
        key: `${self.id}:provoke:${enemy.id}`,
        investigator: self.owner,
        label: 'ability.wrenchProvoke',
        params: { enemy: enemy.name },
        target: { type: 'enemy' as const, id: enemy.id },
        then: [
          { type: 'ExhaustAsset', asset: self.id },
          { type: 'EngageEnemy', enemy: enemy.id, investigator: self.owner },
          { type: 'EnemyAttack', enemy: enemy.id, investigator: self.owner, exhaustAfter: false },
        ] satisfies Message[],
      }))
  },
  reactions: (s, trigger, self) =>
    trigger.type === 'afterDamageAssigned' &&
    trigger.enemy &&
    s.enemies[trigger.enemy] &&
    trigger.dealt.some((d) => d.asset === self.id && d.damage + d.horror > 0)
      ? [
          reaction(
            self,
            'ability.guardDog',
            [{ type: 'DamageEnemy', enemy: trigger.enemy, amount: 1, by: self.owner }],
            { card: cardName(code), enemy: s.enemies[trigger.enemy]!.name },
          ),
        ]
      : [],
})
