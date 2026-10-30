// RR: Uses, Exhaust, Move, Revealed. Esoteric Atlas (1): spend 1 secret and exhaust to move to
// a revealed location exactly 2 connections away (not one connection or fewer).
import {
  canAffordEntry,
  canEnter,
  getInvestigator,
  getLocation,
  leavingBlocked,
  moveBlocked,
  playerCardDef,
  registerPlayerCard,
  type GameState,
  type InvestigatorId,
} from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'

const code = '05232'
function twoAway(s: GameState, by: InvestigatorId): string[] {
  const here = getInvestigator(s, by).location
  if (here === null || leavingBlocked(s, here) || moveBlocked(s, by)) return []
  const near = new Set([here, ...getLocation(s, here).connections])
  return [
    ...new Set(
      getLocation(s, here)
        .connections.filter((id) => s.locations[id])
        .flatMap((id) => getLocation(s, id).connections),
    ),
  ].filter(
    (to) =>
      !near.has(to) && s.locations[to]?.revealed && canAffordEntry(s, to) && canEnter(s, by, to),
  )
}
registerPlayerCard({
  code,
  abilities: (s, a, by) => {
    const targets = twoAway(s, by)
    return a.exhausted || a.uses < 1 || targets.length === 0
      ? []
      : [
          {
            key: a.id + ':atlas',
            label: 'ability.moveWithCard',
            params: { card: playerCardDef(code)!.name },
            actions: 1,
            provokes: true,
            costs: [
              { type: 'SpendUses', asset: a.id, amount: 1 },
              { type: 'ExhaustAsset', asset: a.id },
            ],
            then: ask(
              by,
              targets.map((to) => ({
                label: 'action.move',
                params: { location: getLocation(s, to).name },
                target: { type: 'location', id: to },
                then: [{ type: 'MoveTo', investigator: by, location: to }],
              })),
              true,
            ),
          },
        ]
  },
})
