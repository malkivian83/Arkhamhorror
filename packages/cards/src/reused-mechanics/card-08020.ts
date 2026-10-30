import {
  attackBlocked,
  fightEnemies,
  registerPlayerCard,
  type Enemy,
  type GameState,
  type Message,
} from '@lcg/engine'
import { basicTest } from '../basic-events/register'
import { ask } from '../dunwich-pilot/effects'
// RR: Fight; Costs; Automatic Success. Toe to Toe: as an additional cost, the chosen enemy makes
// an attack against you (instructed by the card, so even if exhausted); then the attack succeeds
// automatically and deals +1 damage. Fight events do not provoke attacks of opportunity.
const code = '08020'
const targets = (s: GameState, by: string): Enemy[] =>
  fightEnemies(s, by).filter(
    (e) =>
      !attackBlocked(s, by, e, code) && (e.engagedWith !== null || !e.keywords.includes('aloof')),
  )
registerPlayerCard({
  code,
  fightAction: true,
  noAttacksOfOpportunity: true,
  canPlay: (s, by) => targets(s, by).length > 0,
  play: (s, by) =>
    ask(
      by,
      targets(s, by).map((e) => ({
        label: 'choice.enemy',
        params: { enemy: e.name },
        target: { type: 'enemy', id: e.id },
        then: [
          {
            type: 'EnemyAttack',
            enemy: e.id,
            investigator: by,
            exhaustAfter: false,
            evenIfExhausted: true,
          },
          {
            ...(basicTest(
              { action: 'fight', extraDamage: 1, tags: ['spirit', 'tactic'] },
              { state: s, investigator: by, code },
              e,
            ) as Extract<Message, { type: 'BeginSkillTest' }>),
            autoSuccess: true,
            effectSource: code,
          },
        ] satisfies Message[],
      })),
      true,
    ),
})
