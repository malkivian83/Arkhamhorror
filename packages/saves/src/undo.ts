import type { GameState } from '@lcg/engine'

/** Hasta dónde deshacer. */
export type UndoKind = 'step' | 'action' | 'turn' | 'round'

/** Situación de la partida en un punto del historial (antes de una decisión). */
export interface Mark {
  round: number
  phase: GameState['phase']
  investigator: string | null
  prompt: string | null
}

export function markOf(state: GameState): Mark {
  return {
    round: state.round,
    phase: state.phase,
    investigator: state.pending?.investigator ?? null,
    prompt: state.pending?.question.prompt ?? null,
  }
}

const isActionMenu = (m: Mark) => m.phase === 'investigation' && m.prompt === 'prompt.chooseAction'

/**
 * Posición del historial a la que vuelve cada tipo de deshacer. Las posiciones
 * van de 0 (estado inicial) a marks.length (estado actual).
 */
export function undoTarget(marks: Mark[], kind: UndoKind): number | null {
  const n = marks.length - 1
  if (n <= 0) return null
  const before = (p: number, test: (m: Mark, p: number) => boolean) => {
    for (let i = p - 1; i >= 0; i--) if (test(marks[i]!, i)) return i
    return null
  }
  /** Primera posición del turno que contiene la posición p (o null si p no es de un turno). */
  const turnStart = (p: number) => {
    const m = marks[p]!
    if (m.phase !== 'investigation') return null
    let start = p
    for (let i = p - 1; i >= 0; i--) {
      const o = marks[i]!
      if (o.phase !== 'investigation' || o.round !== m.round) break
      if (isActionMenu(o) && o.investigator !== m.investigator) break
      start = i
    }
    return start
  }
  switch (kind) {
    case 'step':
      return n - 1
    case 'action':
      return before(n, isActionMenu) ?? 0
    case 'turn': {
      const start = turnStart(n)
      if (start !== null && start < n) return start
      const previous = before(n, (m) => m.phase === 'investigation')
      return previous === null ? 0 : (turnStart(previous) ?? previous)
    }
    case 'round': {
      const round = marks[n]!.round
      const start = marks.findIndex((m) => m.round === round)
      if (start < n) return start
      return Math.max(
        0,
        marks.findIndex((m) => m.round === round - 1),
      )
    }
  }
}
