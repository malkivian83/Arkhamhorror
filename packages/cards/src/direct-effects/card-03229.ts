import { engagedEnemies, getInvestigator, registerPlayerCard, type Choice } from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'
// Mano a Mano (1): play only as your first action; deal 1 damage to an enemy engaged with
// you, without provoking attacks of opportunity.
registerPlayerCard({
  code: '03229',
  noAttacksOfOpportunity: true,
  canPlay: (s, by) =>
    (getInvestigator(s, by).actionsTaken ?? 0) === 0 && engagedEnemies(s, by).length > 0,
  play: (s, by) =>
    ask(
      by,
      engagedEnemies(s, by).map((enemy): Choice => ({
        label: 'choice.enemy',
        params: { enemy: enemy.name },
        target: { type: 'enemy', id: enemy.id },
        then: [{ type: 'DamageEnemy', enemy: enemy.id, amount: 1, by }],
      })),
    ),
})
