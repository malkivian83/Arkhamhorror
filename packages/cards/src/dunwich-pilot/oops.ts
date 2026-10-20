import { attackDamage, getInvestigator, registerPlayerCard } from '@lcg/engine'
import { ask, cardName } from './effects'
registerPlayerCard({
  code: '02113',
  canPlay: () => false,
  handReactions: (state, trigger, investigator) => {
    const test = state.skillTest
    if (
      trigger.type !== 'afterSkillTest' ||
      trigger.investigator !== investigator ||
      trigger.succeeded ||
      trigger.margin < -2 ||
      !test ||
      test.kind.type !== 'fight'
    )
      return []
    const attacked = state.enemies[test.kind.enemy],
      here = getInvestigator(state, investigator).location
    if (!attacked || attacked.engagedWith !== investigator || here === null) return []
    const damage = attackDamage(state, test)
    const targets = Object.values(state.enemies).filter(
      (e) => e.location === here && e.id !== attacked.id,
    )
    return targets.length
      ? [
          {
            key: 'hand:02113',
            investigator,
            label: 'ability.playCard',
            params: { card: cardName('02113') },
            then: [
              {
                type: 'PlayCard',
                investigator,
                code: '02113',
                effect: ask(
                  investigator,
                  targets.map((e) => ({
                    label: 'choice.enemy',
                    params: { enemy: e.name },
                    target: { type: 'enemy', id: e.id },
                    then: [{ type: 'DamageEnemy', enemy: e.id, amount: damage, by: investigator }],
                  })),
                ),
              },
            ],
          },
        ]
      : []
  },
})
