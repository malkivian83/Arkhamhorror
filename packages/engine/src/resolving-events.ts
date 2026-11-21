import { resolvingCopy } from './event-copy-source'
import { playerCardDef } from './content'
// RR: Event cards remain in limbo until their effects finish resolving.
import { actualDiscardIndex, discardLocked, getInvestigator } from './state'
export { actualDiscard } from './state'
import type { GameState, Message } from './types'

export function pendingEvent(s: GameState, by: string, code: string, id?: string) {
  return s.resolvingPlayerEvents?.find(
    (f) => f.id === id && f.investigator === by && f.code === code && f.provisional,
  )
}

export function eventDiscardIndex(
  s: GameState,
  by: string,
  code: string,
  id?: string,
  source?: string,
): number {
  const frame = s.resolvingPlayerEvents?.find(
    (f) => f.id === id && f.investigator === by && f.code === code,
  )
  if (frame && (source === code || source === playerCardDef(code)?.name))
    return frame.provisional ? getInvestigator(s, by).discard.lastIndexOf(code) : -1
  return actualDiscardIndex(s, by, code)
}

export function eventMovementBlocked(
  s: GameState,
  by: string,
  code: string,
  id?: string,
  source?: string,
): boolean {
  return (
    discardLocked(s, by) &&
    !(
      (pendingEvent(s, by, code, id) || resolvingCopy(s, by, code, id)) &&
      (source === code || source === playerCardDef(code)?.name)
    )
  )
}

/** Keep a resolving physical event distinct from older copies and nested event plays. */
export function settleResolvingEvents(
  before: GameState,
  after: GameState,
  message: Message,
): GameState {
  if (
    ![
      'RemoveFromDiscard',
      'ShufflePlayedEvent',
      'EventToVictory',
      'AttachPlayerCardToEnemy',
      'AttachEventToLocation',
      'AttachEventToAsset',
      'SealToken',
      'DiscardToHand',
    ].includes(message.type)
  )
    return after
  if (message.type === 'DiscardToHand' && !message.playedEvent) return after
  if (!message.eventCopy || !after.resolvingPlayerEvents?.length) return after
  const frame = after.resolvingPlayerEvents.find((f) => f.id === message.eventCopy && f.provisional)
  if (
    !frame ||
    (message.effectSource !== frame.code &&
      message.effectSource !== playerCardDef(frame.code)?.name)
  )
    return after
  const count = (s: GameState) =>
    getInvestigator(s, frame.investigator).discard.filter((c) => c === frame.code).length
  return count(after) < count(before)
    ? {
        ...after,
        resolvingPlayerEvents: after.resolvingPlayerEvents.map((f) =>
          f.id === frame.id ? { ...f, provisional: false } : f,
        ),
      }
    : after
}
