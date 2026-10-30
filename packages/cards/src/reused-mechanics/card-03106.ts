import { enemyBehavior, getInvestigator, playerCardDef, registerPlayerCard } from '@lcg/engine'
import { elite } from '../basic-events/register'
// RR: Cancel; Enemy Attacks; Engaging. Heroic Rescue: when a non-Elite enemy would attack another
// investigator at your location, the enemy engages you and resolves that same attack against you
// (no new attack window), you deal it 1 damage, and the original attack is canceled afterwards so
// its queued resolution against the other investigator is skipped. Uncancelable attacks cannot be
// redirected.
const code = '03106'
registerPlayerCard({
  code,
  canPlay: () => false,
  handReactions: (s, t, by) => {
    if (t.type !== 'whenEnemyAttacks' || t.investigator === by || s.canceledAttack === t.enemy)
      return []
    const enemy = s.enemies[t.enemy]
    const me = getInvestigator(s, by),
      attacked = getInvestigator(s, t.investigator)
    if (
      !enemy ||
      elite(enemy) ||
      enemyBehavior(enemy.code)?.attacksCannotBeCanceled ||
      me.location === null ||
      me.location !== attacked.location
    )
      return []
    return [
      {
        key: 'hand:' + code,
        investigator: by,
        label: 'ability.playCard',
        params: { card: playerCardDef(code)!.name },
        target: { type: 'hand', code },
        then: [
          {
            type: 'PlayCard',
            investigator: by,
            code,
            effect: [
              { type: 'EngageEnemy', enemy: enemy.id, investigator: by },
              {
                type: 'ResolveEnemyAttack',
                enemy: enemy.id,
                investigator: by,
                exhaustAfter: false,
              },
              { type: 'DamageEnemy', enemy: enemy.id, amount: 1, by, source: { code } },
              { type: 'CancelEnemyAttack', enemy: enemy.id },
            ],
          },
        ],
      },
    ]
  },
})
