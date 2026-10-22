import {
  enemiesAt,
  registerPlayerCard,
  type Choice,
  type Enemy,
  type GameState,
  type Message,
  type SkillType,
} from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'
import { elite } from '../basic-events/register'
import { here } from './register'

/** "Choose an enemy at your location and test <skill> (X), X its evade value." */
export function registerEnemyTest(
  code: string,
  skill: SkillType,
  eligible: (enemy: Enemy, by: string) => boolean,
  onSuccess: (enemy: Enemy, by: string, state: GameState) => Message[],
): void {
  const targets = (s: GameState, by: string) => {
    const location = here(s, by)
    return location === null ? [] : enemiesAt(s, location).filter((e) => eligible(e, by))
  }
  registerPlayerCard({
    code,
    canPlay: (s, by) => targets(s, by).length > 0,
    play: (s, by) =>
      ask(
        by,
        targets(s, by).map((enemy): Choice => ({
          label: 'choice.enemy',
          params: { enemy: enemy.name },
          target: { type: 'enemy', id: enemy.id },
          then: [
            {
              type: 'BeginSkillTest',
              investigator: by,
              skill,
              difficulty: enemy.evade,
              kind: {
                type: 'effect',
                source: code,
                onSuccess: onSuccess(enemy, by, s),
                onFail: [],
                onFailEach: [],
              },
            },
          ],
        })),
      ),
  })
}

// Waylay: an exhausted non-Elite enemy at your location; agility (its evade) defeats it.
export const registerWaylay = () =>
  registerEnemyTest(
    '03237',
    'agility',
    (e) => e.exhausted && !elite(e),
    (e, by) => [{ type: 'DefeatEnemy', enemy: e.id, by }],
  )

// Eavesdrop: an unengaged enemy at your location; intellect (its evade) discovers 2 clues.
export const registerEavesdrop = () =>
  registerEnemyTest(
    '04027',
    'intellect',
    (e) => e.engagedWith === null,
    (_e, by, s) => {
      const location = here(s, by)
      return location === null
        ? []
        : [{ type: 'DiscoverClues', investigator: by, location, amount: 2 }]
    },
  )
