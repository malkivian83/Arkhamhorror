import type { GameState } from '@lcg/engine'
import { ref, watch } from 'vue'

const PREFERENCE_KEY = 'lcg:quickTests'

/**
 * Preferencia del jugador: en una prueba de habilidad, revelar la ficha y aplicar el
 * resultado sin pulsar cuando es lo único que se puede hacer (activado por defecto).
 */
export const quickTests = ref(readPreference())

function readPreference(): boolean {
  try {
    return localStorage.getItem(PREFERENCE_KEY) !== 'off'
  } catch {
    return true
  }
}

watch(quickTests, (value) => {
  try {
    localStorage.setItem(PREFERENCE_KEY, value ? 'on' : 'off')
  } catch {
    // Sin almacenamiento: la preferencia dura lo que la pestaña.
  }
})

/** Pausa para leer la prueba antes de revelar y para ver el resultado antes de aplicarlo. */
export const REVEAL_DELAY_MS = 800
export const APPLY_DELAY_MS = 1600

/**
 * La respuesta que la mesa puede dar sola: la pregunta de la prueba solo ofrece revelar
 * la ficha (nada que comprometer ni capacidades) o aplicar el resultado. El motor sigue
 * haciendo la pregunta y la decisión queda en el historial como cualquier otra.
 */
export function automaticTestAnswer(
  state: GameState,
): { index: number; kind: 'reveal' | 'apply'; delay: number } | null {
  const question = state.pending?.question
  if (!state.skillTest || !question || question.choices.length !== 1) return null
  const [only] = question.choices
  if (question.prompt === 'prompt.commitCards' && only!.label === 'choice.revealToken')
    return { index: 0, kind: 'reveal', delay: REVEAL_DELAY_MS }
  if (only!.label === 'choice.applyResults')
    return { index: 0, kind: 'apply', delay: APPLY_DELAY_MS }
  return null
}
