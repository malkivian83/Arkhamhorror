// RR: Fight, Evade, Discard Pile, Complete Resolution, Defeat, Replacement Effects.
import {
  registerPlayerCard,
  eventsToDeckBottom,
  engagedEnemies,
  skillTestValue,
  attachedStat,
  scenarioBehavior,
  type GameState,
} from '@lcg/engine'
import { attackable, ask, cardName, continuation } from '../dunwich-pilot/effects'
export function registerImprovised(code: string): void {
  if (!['04033', '11092', '04312'].includes(code)) throw Error('Unreviewed improvised card ' + code)
  const barrier = code === '04312'
  const targets = (s: GameState, by: string) =>
    barrier
      ? engagedEnemies(s, by).filter((e) => !e.cannotBeEvaded && !e.hasNoStats)
      : attackable(s, by)
  registerPlayerCard({
    code,
    playableFromDiscard: true,
    ...(barrier ? { evadeAction: true } : { fightAction: true }),
    canPlay: (s, by) => targets(s, by).length > 0,
    play: (s, by, _x, fromDiscard) =>
      ask(
        by,
        targets(s, by).map((e) => ({
          label: 'choice.improvisedEnemy',
          params: { enemy: e.name, card: cardName(code) },
          target: { type: 'enemy', id: e.id },
          then: [
            {
              type: 'BeginSkillTest',
              investigator: by,
              skill: barrier ? 'agility' : 'combat',
              difficulty: e[barrier ? 'evade' : 'fight'] - (code === '11092' ? 2 : 1),
              effectSource: code,
              kind: barrier
                ? {
                    type: 'evade',
                    enemy: e.id,
                    ...(fromDiscard
                      ? {
                          onSuccess: [
                            continuation(code, by, 'extra', { enemy: e.id, location: e.location }),
                          ],
                        }
                      : {}),
                  }
                : { type: 'fight', enemy: e.id, ...(fromDiscard ? { extraDamage: 1 } : {}) },
            },
            ...(fromDiscard
              ? [
                  {
                    type: 'ShufflePlayedEvent' as const,
                    investigator: by,
                    code,
                    fromBottom: eventsToDeckBottom(s, by),
                  },
                  ...(code === '11092'
                    ? [{ type: 'DrawCards' as const, investigator: by, amount: 1 }]
                    : []),
                ]
              : []),
          ],
        })),
        true,
      ),
    effect: (s, by, step, data) => {
      if (step !== 'extra' || !s.skillTest) return []
      const margin = skillTestValue(s).total - s.skillTest.difficulty
      return ask(
        by,
        [
          ...Object.values(s.enemies)
            .filter(
              (e) =>
                e.id !== data.enemy &&
                e.location === data.location &&
                !e.cannotBeEvaded &&
                !e.hasNoStats &&
                Math.max(
                  0,
                  e.evade +
                    attachedStat(s, e.id, 'evade') +
                    (scenarioBehavior(s.scenarioId)?.enemyStat?.(s, e, 'evade', undefined, by) ??
                      0),
                ) <= margin,
            )
            .map((e) => ({
              label: 'choice.improvisedExtra',
              params: { enemy: e.name },
              target: { type: 'enemy' as const, id: e.id },
              then: [{ type: 'EvadeEnemy' as const, enemy: e.id, by }],
            })),
          { label: 'choice.skip', then: [] },
        ],
        true,
      )
    },
  })
}
