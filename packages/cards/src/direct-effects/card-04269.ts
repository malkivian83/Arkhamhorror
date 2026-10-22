import { enemiesAt, registerPlayerCard, type Choice } from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'
import { endIfYourTurn, here } from './register'
// Coup de Grâce: deal 1 damage to an enemy at your location; if that defeats it, draw 1
// card. If it is your turn, end your turn. Does not provoke attacks of opportunity.
const targets = (s: Parameters<typeof here>[0], by: string) => {
  const location = here(s, by)
  return location === null ? [] : enemiesAt(s, location)
}
registerPlayerCard({
  code: '04269',
  noAttacksOfOpportunity: true,
  canPlay: (s, by) => targets(s, by).length > 0,
  play: (s, by) =>
    ask(
      by,
      targets(s, by).map((enemy): Choice => ({
        label: 'choice.enemy',
        params: { enemy: enemy.name },
        target: { type: 'enemy', id: enemy.id },
        then: [
          { type: 'DamageEnemy', enemy: enemy.id, amount: 1, by },
          {
            type: 'IfEnemyDefeated',
            enemy: enemy.id,
            then: [{ type: 'DrawCards', investigator: by, amount: 1 }],
          },
          ...endIfYourTurn(s, by),
        ],
      })),
    ),
})
