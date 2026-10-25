import { ref, watch } from 'vue'

const PREFERENCE_KEY = 'lcg:autoSteps'

/** Preferencia del jugador: mostrar el visor de pasos automáticos (activado por defecto). */
export const showAutoSteps = ref(readPreference())

function readPreference(): boolean {
  try {
    return localStorage.getItem(PREFERENCE_KEY) !== 'off'
  } catch {
    return true
  }
}

watch(showAutoSteps, (value) => {
  try {
    localStorage.setItem(PREFERENCE_KEY, value ? 'on' : 'off')
  } catch {
    // Sin almacenamiento: la preferencia dura lo que la pestaña.
  }
})
