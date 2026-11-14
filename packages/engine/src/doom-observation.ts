// RR: Replenish; "after doom is placed on a card with no doom" (Cat Mask).
import { activeTreacheryBehavior, playerCardBehavior } from './content'
import { push } from './state'
import type { GameState } from './types'

const listeners = new WeakMap<GameState['assets'], boolean>()
function watches(s: GameState): boolean {
  let value = listeners.get(s.assets)
  if (value === undefined) {
    value = Object.values(s.assets).some((a) => playerCardBehavior(a.code)?.observesDoomPlacement)
    listeners.set(s.assets, value)
  }
  return value
}

export function observeDoom(before: GameState, after: GameState): GameState {
  if (!watches(after)) return after
  let count = before.doom === 0 && after.doom > 0 ? 1 : 0
  if (before.secondAgenda?.doom === 0 && (after.secondAgenda?.doom ?? 0) > 0) count++
  if (before.investigators !== after.investigators)
    for (const i of after.investigators) {
      const previous = before.investigators.find((x) => x.id === i.id)
      if (previous && !previous.doom && (i.doom ?? 0) > 0) count++
    }
  for (const [previous, current] of [
    [before.assets, after.assets],
    [before.enemies, after.enemies],
    [before.locations, after.locations],
  ] as const) {
    if (previous === current) continue
    for (const [id, card] of Object.entries(current))
      if (previous[id] && !(previous[id]!.doom ?? 0) && (card.doom ?? 0) > 0) count++
  }
  if (before.placedAssets !== after.placedAssets)
    for (const [id, card] of Object.entries(after.placedAssets ?? {}))
      if (before.placedAssets?.[id] && !before.placedAssets[id]!.doom && (card.doom ?? 0) > 0)
        count++
  if (before.treacheries !== after.treacheries)
    for (const [id, card] of Object.entries(after.treacheries))
      if (
        before.treacheries[id] &&
        !before.treacheries[id]!.tokens &&
        (card.tokens ?? 0) > 0 &&
        activeTreacheryBehavior(after, card)?.tokenKind === 'doom'
      )
        count++
  return count
    ? push(
        after,
        ...Array.from({ length: count }, () => ({
          type: 'Forced' as const,
          trigger: { type: 'afterDoomOnEmptyCard' as const },
        })),
      )
    : after
}
