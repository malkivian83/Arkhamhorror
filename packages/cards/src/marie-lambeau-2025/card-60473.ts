// RR: Fast, Enemy Attacks, Damage and Horror, Dealing Damage.
import { enemiesAt, getInvestigator, registerPlayerCard } from '@lcg/engine'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'
import { RETRIBUTION } from './codes'

// Retribution: Fast. Play when an enemy attacks an investigator at your location. You take all
// damage and horror from this attack. For each point of damage/horror taken, deal 1 damage to
// an enemy at your location. Points assigned to your assets are also taken from the attack.
registerPlayerCard({
  code: RETRIBUTION,
  handReactions: (s, t, by) => {
    if (t.type !== 'whenEnemyAttacks') return []
    const here = getInvestigator(s, by).location
    if (here === null || getInvestigator(s, t.investigator).location !== here) return []
    return [
      {
        key: 'hand:' + RETRIBUTION,
        investigator: by,
        label: 'ability.playCard',
        params: { card: cardName(RETRIBUTION) },
        target: { type: 'hand' as const, code: RETRIBUTION },
        then: [
          {
            type: 'PlayCard' as const,
            investigator: by,
            code: RETRIBUTION,
            effect: [
              {
                type: 'RedirectEnemyAttackDamage' as const,
                enemy: t.enemy,
                investigator: by,
                then: [
                  continuation(RETRIBUTION, by, 'taken', {
                    seq: s.lastAttackDamage?.seq ?? 0,
                    enemy: t.enemy,
                  }),
                ],
              },
            ],
          },
        ],
      },
    ]
  },
  effect: (s, by, step, data) => {
    let left = Number(data.left ?? 0)
    if (step === 'taken') {
      const dealt = s.lastAttackDamage
      left =
        dealt &&
        dealt.seq !== Number(data.seq) &&
        dealt.investigator === by &&
        dealt.enemy === data.enemy
          ? dealt.damage + dealt.horror
          : 0
    } else if (step !== 'deal') return []
    const here = getInvestigator(s, by).location
    if (left <= 0 || here === null) return []
    return ask(
      by,
      enemiesAt(s, here).map((e) => ({
        label: 'choice.enemy',
        params: { enemy: e.name },
        target: { type: 'enemy' as const, id: e.id },
        then: [
          {
            type: 'DamageEnemy' as const,
            enemy: e.id,
            amount: 1,
            by,
            source: { code: RETRIBUTION },
          },
          continuation(RETRIBUTION, by, 'deal', { left: left - 1 }),
        ],
      })),
    )
  },
})
