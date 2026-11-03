// RR: Move, Swap, Enemy Engagement, Parley, Attacks of Opportunity.
import {
  registerPlayerCard,
  getInvestigator,
  distancesFrom,
  leavingBlocked,
  moveBlocked,
  canAffordEntry,
  scenarioBehavior,
  type GameState,
} from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'
export function registerEnemyRelocation(code: string): void {
  if (!['08108', '08110', '60466'].includes(code)) throw Error('Unreviewed relocation ' + code)
  const charm = code === '60466'
  const targets = (s: GameState, by: string) => {
    const here = getInvestigator(s, by).location
    if (!here) return []
    const scenario = scenarioBehavior(s.scenarioId)
    if (!charm && (leavingBlocked(s, here) || moveBlocked(s, by) || scenario?.cannotLeave?.(s, by)))
      return []
    const distances = distancesFrom(s, here)
    return Object.values(s.enemies).filter(
      (e) =>
        !e.global &&
        !e.traits?.includes('Elite') &&
        (charm
          ? e.location === here || s.locations[here]!.connections.includes(e.location)
          : s.locations[e.location]?.revealed &&
            canAffordEntry(s, e.location) &&
            scenario?.canEnter?.(s, by, here, e.location) !== false &&
            (code === '08110' || (distances.get(e.location) ?? Infinity) <= 2)),
    )
  }
  registerPlayerCard({
    code,
    ...(charm ? { parley: true, noAttacksOfOpportunity: true } : {}),
    canPlay: (s, by) => targets(s, by).length > 0,
    play: (s, by) =>
      ask(
        by,
        targets(s, by).map((e) => ({
          label: 'choice.relocationEnemy',
          params: { enemy: e.name },
          target: { type: 'enemy' as const, id: e.id },
          then: charm
            ? [
                ...(e.location === getInvestigator(s, by).location
                  ? []
                  : [
                      {
                        type: 'MoveEnemy' as const,
                        enemy: e.id,
                        location: getInvestigator(s, by).location!,
                      },
                    ]),
                { type: 'EngageEnemy' as const, enemy: e.id, investigator: by },
                {
                  type: 'GainResources' as const,
                  investigator: by,
                  amount:
                    Math.max(
                      0,
                      e.damage + (scenarioBehavior(s.scenarioId)?.enemyDamageModifier?.(s, e) ?? 0),
                    ) +
                    Math.max(
                      0,
                      e.horror + (scenarioBehavior(s.scenarioId)?.enemyHorrorModifier?.(s, e) ?? 0),
                    ),
                },
              ]
            : [
                {
                  type: 'MoveTo' as const,
                  investigator: by,
                  location: e.location,
                  swapEnemy: e.id,
                },
              ],
        })),
        true,
      ),
  })
}
