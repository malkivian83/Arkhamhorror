import { assetTurnActions } from './content'
import { getInvestigator, updateInvestigator } from './state'
import type { GameState, Message, TurnActionGrant } from './types'

/**
 * RR Additional Actions: use continuous bonus actions before ordinary actions. A grant whose
 * condition stops holding is kept inactive (its unused actions come back if it holds again
 * during the turn, never a second full grant); it is dropped when the asset leaves play.
 */
export function synchronizeTurnActions(
  before: GameState,
  after: GameState,
  message: Message,
): GameState {
  if (before.immediateActions?.length || after.immediateActions?.length) return after
  const id = after.activeTurn
  if (!id) {
    if (!after.turnActionGrants) return after
    const { turnActionGrants: _done, ...rest } = after
    return rest
  }
  const owned = Object.values(after.assets).filter((a) => a.owner === id)
  const old = message.type === 'BeginTurn' ? [] : (after.turnActionGrants ?? [])
  if (!old.length && !owned.some((a) => assetTurnActions(after, a) > 0)) return after
  let spent =
    message.type === 'BeginTurn' || before.activeTurn !== id
      ? 0
      : Math.max(
          0,
          getInvestigator(before, id).actionsRemaining -
            getInvestigator(after, id).actionsRemaining,
        )
  const used = old.map((grant) => {
    if (grant.inactive) return grant
    const consume = Math.min(grant.remaining, spent)
    spent -= consume
    return { ...grant, remaining: grant.remaining - consume }
  })
  let delta = 0
  const grants: TurnActionGrant[] = []
  for (const grant of used) {
    const asset = owned.find((a) => a.id === grant.asset)
    if (!asset) {
      if (!grant.inactive) delta -= grant.remaining
      continue
    }
    const holds = assetTurnActions(after, asset) > 0
    if (holds === !grant.inactive) {
      grants.push(grant)
      continue
    }
    delta += holds ? grant.remaining : -grant.remaining
    const { inactive: _was, ...active } = grant
    grants.push(holds ? active : { ...grant, inactive: true })
  }
  for (const asset of owned) {
    if (grants.some((g) => g.asset === asset.id)) continue
    const remaining = assetTurnActions(after, asset)
    if (remaining <= 0) continue
    delta += remaining
    grants.push({ asset: asset.id, remaining })
  }
  const next = grants.length
    ? { ...after, turnActionGrants: grants }
    : (() => {
        const { turnActionGrants: _done, ...rest } = after
        return rest
      })()
  return delta === 0
    ? next
    : updateInvestigator(next, id, (i) => ({
        ...i,
        actionsRemaining: Math.max(0, i.actionsRemaining + delta),
      }))
}
