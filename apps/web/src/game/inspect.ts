import { ref, shallowRef, type InjectionKey } from 'vue'

/** Carta de la mesa tal como se ve (cara, orientación). */
export interface InspectedCard {
  code: string
  name: string
  back: boolean
  landscape: boolean
}

/**
 * Sin ratón (móvil, tableta) no hay ampliación al pasar por encima: al tocar una
 * carta de la mesa se abre ampliada con sus opciones debajo.
 */
const query =
  typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(hover: none)') : null
export const noHover = ref(query?.matches ?? false)
query?.addEventListener('change', (e) => (noHover.value = e.matches))

/** Carta abierta al tocarla y elemento de la mesa del que salen sus opciones. */
export const inspected = shallowRef<{ card: InspectedCard; target: string } | null>(null)

/** Cada elemento de la mesa conoce la carta que muestra, para abrirla al tocarlo. */
export const TABLE_CARD: InjectionKey<(card: () => InspectedCard) => () => void> =
  Symbol('table-card')
