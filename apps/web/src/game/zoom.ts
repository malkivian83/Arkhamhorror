import { ref } from 'vue'

/** Carta bajo el ratón, para mostrarla ampliada. */
export const zoomed = ref<{ code: string; name: string; back: boolean; landscape: boolean } | null>(
  null,
)
