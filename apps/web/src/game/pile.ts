import { shallowRef } from 'vue'

/** Una pila de cartas que se puede abrir para verla entera (descartes, victoria…). */
export interface Pile {
  /** Clave i18n del título y sus parámetros. */
  title: string
  params?: Record<string, string | number>
  cards: { code: string; name: string }[]
  /** Mostrar primero la carta de arriba (la última que llegó). */
  newestFirst?: boolean
}

export const openPile = shallowRef<Pile | null>(null)

export function showPile(pile: Pile) {
  openPile.value = pile
}
