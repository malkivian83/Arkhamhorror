import type { GameState } from './types'

/** RR Seal: tokens sealed on a card return to the chaos bag when that card leaves play. */
export function releaseOrphanedSeals(state: GameState): GameState {
  const sealed = state.sealed
  if (!sealed?.some((e) => e.holder)) return state
  const orphaned = sealed.filter(
    (e) => e.holder && !(e.holder.type === 'asset' ? state.assets : state.enemies)[e.holder.id],
  )
  if (!orphaned.length) return state
  return {
    ...state,
    sealed: sealed.filter((e) => !orphaned.includes(e)),
    chaosBag: [...state.chaosBag, ...orphaned.map((e) => e.token)],
  }
}
