import { ref } from 'vue'

/** Carta bajo el ratón, para mostrarla ampliada. */
export const zoomed = ref<{ src: string; alt: string } | null>(null)
