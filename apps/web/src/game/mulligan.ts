import type { GameState } from '@lcg/engine'

/**
 * Investigador que empieza su mulligan: aún no ha cambiado ninguna carta (la
 * opción de terminar es «quedarme con esta mano»). Null en cualquier otro momento.
 */
export function startingMulligan(state: GameState | null): { id: string; name: string } | null {
  const pending = state?.pending
  if (!state || !pending?.question.mulligan) return null
  if (!pending.question.choices.some((c) => c.label === 'choice.keepHand')) return null
  const investigator = state.investigators.find((i) => i.id === pending.investigator)
  return investigator ? { id: investigator.id, name: investigator.name } : null
}
