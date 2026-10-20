import { registerPlayerCard } from '@lcg/engine'
import { ask, attackable } from './effects'
registerPlayerCard({
  code: '02107',
  noAttacksOfOpportunity: true,
  canPlay: (state, investigator) => attackable(state, investigator).length > 0,
  play: (state, investigator) =>
    ask(
      investigator,
      attackable(state, investigator).map((enemy) => ({
        label: 'action.fight',
        params: { enemy: enemy.name },
        target: { type: 'enemy', id: enemy.id },
        then: [
          {
            type: 'BeginSkillTest',
            investigator,
            skill: 'intellect',
            difficulty: enemy.fight,
            kind: { type: 'fight', enemy: enemy.id, damageFromClues: 3 },
          },
        ],
      })),
    ),
})
