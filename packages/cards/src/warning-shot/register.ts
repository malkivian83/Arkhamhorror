import {
  enemiesAt,
  getInvestigator,
  getLocation,
  playerCardDef,
  registerPlayerCard,
  type GameState,
} from '@lcg/engine'
import { ask, continuation } from '../dunwich-pilot/effects'
const code = '05229'
const firearms = (s: GameState, by: string) =>
  Object.values(s.assets).filter(
    (a) =>
      a.owner === by &&
      a.uses > 0 &&
      playerCardDef(a.code)?.traits.includes('Firearm') &&
      playerCardDef(a.code)?.uses?.type === 'ammo',
  )
const enemies = (s: GameState, by: string) => {
  const here = getInvestigator(s, by).location
  return here === null
    ? []
    : enemiesAt(s, here).filter((e) => !e.global && !e.traits?.includes('Elite'))
}
const destinations = (s: GameState, by: string) => {
  const here = getInvestigator(s, by).location
  return here === null ? [] : getLocation(s, here).connections.filter((id) => !!s.locations[id])
}
// RR: Additional Costs, Uses, Move, Elite. All enemies move to the same destination.
export function registerWarningShot(_code: string): void {
  if (_code !== code) throw Error('Unreviewed Warning Shot')
  registerPlayerCard({
    code,
    noAttacksOfOpportunity: true,
    canPlay: (s, by) =>
      firearms(s, by).length > 0 && enemies(s, by).length > 0 && destinations(s, by).length > 0,
    play: (s, by) =>
      ask(
        by,
        firearms(s, by).map((a) => ({
          label: 'choice.assignToAsset',
          params: { card: playerCardDef(a.code)!.name },
          target: { type: 'asset', id: a.id },
          then: [
            { type: 'SpendUses', asset: a.id, amount: 1 },
            ...(a.code === '05186'
              ? [{ type: 'GainResources' as const, investigator: by, amount: 1 }]
              : []),
            continuation(code, by, 'move'),
          ],
        })),
      ),
    effect: (s, by, step) =>
      step !== 'move'
        ? []
        : ask(
            by,
            destinations(s, by).map((location) => ({
              label: 'choice.location',
              params: { location: getLocation(s, location).name },
              target: { type: 'location', id: location },
              then: enemies(s, by).map((e) => ({ type: 'MoveEnemy', enemy: e.id, location })),
            })),
          ),
  })
}
