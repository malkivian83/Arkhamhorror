// RR Copy: physical source and permitted events, independent of play validation.
import { playerCardBehavior, playerCardDef } from './content'
import { getInvestigator, updateInvestigator } from './state'
import type { GameState } from './types'
export function copyPreview(s: GameState, by: string, physical: string, as: string): GameState {
  const i = getInvestigator(s, by),
    at = i.hand.indexOf(physical)
  return at < 0
    ? s
    : updateInvestigator(s, by, (x) => ({ ...x, hand: x.hand.map((c, n) => (n === at ? as : c)) }))
}
export const copyTargets = (s: GameState, by: string, physical: string): string[] =>
  [...new Set(playerCardBehavior(physical)?.copyEvents?.(s, by) ?? [])].filter(
    (c) => c !== physical && playerCardDef(c)?.type === 'event' && !playerCardDef(c)?.exceptional,
  )
export const resolvingCopy = (s: GameState, by: string, code: string, id?: string) =>
  s.eventCopies?.findLast((f) => f.id === id && f.investigator === by && f.as === code && f.paid)
