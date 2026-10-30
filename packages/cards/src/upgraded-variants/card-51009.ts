import {
  attackDamage,
  getInvestigator,
  registerPlayerCard,
  testEnemyHasKeyword,
  type GameState,
  type Message,
  type SkillTest,
} from '@lcg/engine'
import { ask, cardName } from '../dunwich-pilot/effects'

// RR: Fight; ST.6 "after you fail" window, before ST.7 applies the results. The attack's damage
// may go to any enemy at your location, the attacked one included. Against an enemy engaged with
// another investigator, the failed results keep their other effects (onFail, Retaliate, Elusive)
// but no longer deal the attack's damage to that investigator.
const code = '51009'

function resultsWithoutFriendlyDamage(state: GameState, test: SkillTest): Message[] | null {
  if (test.kind.type !== 'fight') return null
  const enemy = state.enemies[test.kind.enemy]
  if (!enemy || enemy.engagedWith === null || enemy.engagedWith === test.investigator) return null
  return [
    ...(test.kind.onFail ?? []),
    ...(!enemy.exhausted && testEnemyHasKeyword(state, test, enemy, 'retaliate')
      ? [
          {
            type: 'EnemyAttack' as const,
            enemy: enemy.id,
            investigator: test.investigator,
            exhaustAfter: false,
          },
        ]
      : []),
    ...(enemy.keywords.includes('elusive') && !enemy.exhausted
      ? [{ type: 'ElusiveRetreat' as const, enemy: enemy.id }]
      : []),
  ]
}

registerPlayerCard({
  code,
  canPlay: () => false,
  handReactions: (state, trigger, investigator) => {
    const test = state.skillTest
    const here = getInvestigator(state, investigator).location
    if (
      trigger.type !== 'afterSkillTest' ||
      trigger.investigator !== investigator ||
      trigger.succeeded ||
      trigger.margin < -3 ||
      !test ||
      test.kind.type !== 'fight' ||
      here === null
    )
      return []
    const damage = attackDamage(state, test)
    const replacement = resultsWithoutFriendlyDamage(state, test)
    const targets = Object.values(state.enemies).filter((e) => e.location === here)
    return targets.length
      ? [
          {
            key: 'hand:' + code,
            investigator,
            label: 'ability.playCard',
            params: { card: cardName(code) },
            then: [
              {
                type: 'PlayCard',
                investigator,
                code,
                effect: [
                  ...(replacement
                    ? [{ type: 'ReplaceSkillTestResults' as const, then: replacement }]
                    : []),
                  ...ask(
                    investigator,
                    targets.map((e) => ({
                      label: 'choice.enemy',
                      params: { enemy: e.name },
                      target: { type: 'enemy', id: e.id },
                      then: [
                        { type: 'DamageEnemy', enemy: e.id, amount: damage, by: investigator },
                      ],
                    })),
                  ),
                ],
              },
            ],
          },
        ]
      : []
  },
})
