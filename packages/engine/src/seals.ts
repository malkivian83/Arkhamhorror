import type { GameState, SealHolder } from './types'

/** The card holding a sealed token is still in play (or still committed to the current test). */
export function sealHolderPresent(state: GameState, holder: SealHolder): boolean {
  switch (holder.type) {
    case 'asset':
      return !!state.assets[holder.id]
    case 'enemy':
      return !!state.enemies[holder.id]
    case 'committed':
      return !!state.skillTest?.committed.some((c) => c.code === holder.code && c.by === holder.by)
  }
}

/**
 * RR Seal: tokens sealed on a card return to the chaos bag when that card leaves play;
 * Unrelenting releases its tokens after its test ends.
 */
export function releaseOrphanedSeals(state: GameState): GameState {
  const sealed = state.sealed
  if (!sealed?.some((e) => e.holder)) return state
  const orphaned = sealed.filter((e) => e.holder && !sealHolderPresent(state, e.holder))
  if (!orphaned.length) return state
  return {
    ...state,
    sealed: sealed.filter((e) => !orphaned.includes(e)),
    chaosBag: [...state.chaosBag, ...orphaned.map((e) => e.token)],
  }
}
