import { playerCardBehavior } from './content'
import { getInvestigator, updateInvestigator } from './state'
import type { GameState, Message } from './types'

/** RR Additional Actions: use continuous bonus actions before ordinary actions. */
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
  const sources = Object.values(after.assets).filter(
    (a) => a.owner === id && (playerCardBehavior(a.code)?.additionalTurnActions ?? 0) > 0,
  )
  const old = message.type === 'BeginTurn' ? [] : (after.turnActionGrants ?? [])
  if (!sources.length && !old.length) return after
  let spent =
    message.type === 'BeginTurn' || before.activeTurn !== id
      ? 0
      : Math.max(
          0,
          getInvestigator(before, id).actionsRemaining -
            getInvestigator(after, id).actionsRemaining,
        )
  const used = old.map((grant) => {
    const consume = Math.min(grant.remaining, spent)
    spent -= consume
    return { ...grant, remaining: grant.remaining - consume }
  })
  let delta = -used
    .filter((g) => !sources.some((a) => a.id === g.asset))
    .reduce((n, g) => n + g.remaining, 0)
  const grants = sources.map((a) => {
    const prior = used.find((g) => g.asset === a.id)
    if (prior) return prior
    const remaining = playerCardBehavior(a.code)?.additionalTurnActions ?? 0
    delta += remaining
    return { asset: a.id, remaining }
  })
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
