import { onBeforeUnmount, onMounted } from 'vue'
import { useGameStore } from '../stores/game'

/** Teclas de las acciones básicas (la etiqueta de la opción que eligen). */
export const ACTION_KEYS: Record<string, string> = {
  d: 'action.draw',
  r: 'action.resource',
  e: 'action.endTurn',
}

/** Opciones que Intro/Espacio eligen, por orden de preferencia. */
const CONFIRM_LABELS = ['choice.applyResults', 'choice.revealToken']

function typing(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

/** Atajos de teclado de la mesa mientras el componente está montado. */
export function useShortcuts() {
  const game = useGameStore()

  function onKey(event: KeyboardEvent) {
    if (typing(event.target) || event.altKey) return
    const key = event.key.toLowerCase()

    if ((event.ctrlKey || event.metaKey) && key === 'z') {
      event.preventDefault()
      game.undo(event.shiftKey ? 'turn' : 'action')
      return
    }
    if (event.ctrlKey || event.metaKey) return
    if (key === 'u') return game.undo('step')

    const choices = game.state?.pending?.question.choices ?? []
    const pick = (label: string) => {
      const index = choices.findIndex((c) => c.label === label)
      if (index < 0) return false
      event.preventDefault()
      game.answer(index)
      return true
    }

    const action = ACTION_KEYS[key]
    if (action) return void pick(action)

    if (key === 'enter' || key === ' ') {
      // Sobre un botón con el foco, la tecla ya lo pulsa.
      if ((event.target as HTMLElement | null)?.tagName === 'BUTTON') return
      if (CONFIRM_LABELS.some(pick)) return
      if (choices.length === 1) {
        event.preventDefault()
        game.answer(0)
      }
      return
    }

    // 1-9: botones de la columna lateral, en el orden en que se muestran.
    const n = Number(key)
    if (Number.isInteger(n) && n >= 1) {
      const option = game.untargetedChoices[n - 1]
      if (option) {
        event.preventDefault()
        game.answer(option.index)
      }
    }
  }

  onMounted(() => window.addEventListener('keydown', onKey))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
}
