import {
  finishScenario,
  newCampaign,
  purchase,
  startScenario,
  STARTER_DECKS,
  type Campaign,
  type Difficulty,
} from '@lcg/cards'
import {
  applyInput,
  type CardCode,
  type Choice,
  type ChoiceTarget,
  type GameState,
  type PlayerInput,
} from '@lcg/engine'
import { defineStore } from 'pinia'
import { computed, nextTick, shallowRef } from 'vue'
import { markOf, undoTarget, type Mark, type UndoKind } from '../game/undo'

const STORAGE_KEY = 'lcg:game'
const HISTORY_KEY = 'lcg:history'
const CAMPAIGN_KEY = 'lcg:campaign'

export type DeckKey = keyof typeof STARTER_DECKS

/** Clave única de un elemento de la mesa, para relacionarlo con las opciones. */
export function targetKey(target: ChoiceTarget): string {
  switch (target.type) {
    case 'location':
    case 'enemy':
    case 'treachery':
    case 'asset':
    case 'investigator':
      return `${target.type}:${target.id}`
    case 'hand':
      return `hand:${target.code}`
    case 'agenda':
    case 'act':
      return target.type
  }
}

export interface IndexedChoice {
  index: number
  choice: Choice
}

/**
 * Historial para deshacer: el motor es determinista (la semilla va en el estado),
 * así que basta con el estado inicial y las decisiones; deshacer es repetirlas
 * todas menos las últimas.
 */
interface History {
  base: GameState
  inputs: PlayerInput[]
  marks: Mark[]
}

function load(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    // En la mesa las pruebas siempre son interactivas (también en partidas guardadas antes).
    return { ...(JSON.parse(raw) as GameState), interactive: true }
  } catch {
    return null
  }
}

function loadHistory(state: GameState | null): History | null {
  if (!state) return null
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const history = raw ? (JSON.parse(raw) as History) : null
    if (history && history.marks.length === history.inputs.length + 1) {
      return { ...history, base: { ...history.base, interactive: true } }
    }
  } catch {
    // Historial ilegible: se empieza uno nuevo desde el estado guardado.
  }
  return { base: state, inputs: [], marks: [markOf(state)] }
}

function loadCampaign(): Campaign | null {
  try {
    const raw = localStorage.getItem(CAMPAIGN_KEY)
    return raw ? (JSON.parse(raw) as Campaign) : null
  } catch {
    return null
  }
}

function saveCampaign(campaign: Campaign | null) {
  try {
    if (campaign) localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign))
    else localStorage.removeItem(CAMPAIGN_KEY)
  } catch {
    // Sin almacenamiento: la campaña solo dura mientras la pestaña esté abierta.
  }
}

function save(state: GameState | null, history: History | null) {
  try {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    else localStorage.removeItem(STORAGE_KEY)
    if (history) localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
    else localStorage.removeItem(HISTORY_KEY)
  } catch {
    // Sin almacenamiento: la partida solo dura mientras la pestaña esté abierta.
  }
}

export const useGameStore = defineStore('game', () => {
  const initial = load()
  const state = shallowRef<GameState | null>(initial)
  const history = shallowRef<History | null>(loadHistory(initial))
  const error = shallowRef<string | null>(null)
  /** Campaña en curso: el escenario que se juega es uno de sus escenarios. */
  const campaign = shallowRef<Campaign | null>(loadCampaign())

  /**
   * Estado más reciente. El que se ve (`state`) puede ir un instante por detrás
   * mientras dura la animación de movimiento; las decisiones usan siempre este.
   */
  let latest = state.value

  function set(next: GameState | null, nextHistory: History | null) {
    const previous = latest
    latest = next
    history.value = nextHistory
    save(next, nextHistory)
    // Si algún investigador cambia de localización, su mini se desliza hasta
    // la nueva (transición de vista del navegador, como en el ejemplo).
    const moved =
      !!previous &&
      !!next &&
      next.investigators.some(
        (i) => previous.investigators.find((o) => o.id === i.id)?.location !== i.location,
      )
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const visible = document.visibilityState === 'visible'
    if (moved && !reduced && visible && 'startViewTransition' in document) {
      const transition = document.startViewTransition(async () => {
        // Si ya llegó otro estado, se muestra el último.
        state.value = latest
        await nextTick()
      })
      // Si la animación se cancela o no llega a empezar, el estado se aplica igual.
      const apply = () => {
        if (state.value !== latest) state.value = latest
      }
      transition.updateCallbackDone.catch(apply)
      setTimeout(apply, 400)
      return
    }
    state.value = next
  }

  function setCampaign(next: Campaign | null) {
    campaign.value = next
    saveCampaign(next)
  }

  function play(game: GameState) {
    set(game, { base: game, inputs: [], marks: [markOf(game)] })
  }

  /** Empieza una campaña nueva con su primer escenario. */
  function start(decks: DeckKey[], difficulty: Difficulty) {
    error.value = null
    const next = newCampaign(decks, difficulty)
    setCampaign(next)
    play(startScenario(next, Math.floor(Math.random() * 2 ** 32)))
  }

  /** Guarda el resultado del escenario terminado en la campaña y deja la mesa. */
  function closeScenario() {
    const game = latest
    if (!campaign.value || !game?.outcome) return
    setCampaign(finishScenario(campaign.value, game))
    set(null, null)
  }

  /** Empieza el siguiente escenario de la campaña. */
  function playNext() {
    if (!campaign.value) return
    error.value = null
    play(startScenario(campaign.value, Math.floor(Math.random() * 2 ** 32)))
  }

  /** Gasta experiencia en una carta para el mazo de un investigador. */
  function buy(
    investigator: string,
    card: CardCode,
    options: { remove?: CardCode; upgrade?: boolean } = {},
  ) {
    if (!campaign.value) return
    try {
      setCampaign(purchase(campaign.value, investigator, card, options))
      error.value = null
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    }
  }

  /** Abandona la campaña entera (y el escenario en curso). */
  function abandonCampaign() {
    setCampaign(null)
    set(null, null)
  }

  function answer(index: number) {
    const current = latest
    if (!current?.pending) return
    const input = { investigator: current.pending.investigator, choice: index }
    try {
      const next = applyInput(current, input)
      const h = history.value
      set(
        next,
        h && { base: h.base, inputs: [...h.inputs, input], marks: [...h.marks, markOf(next)] },
      )
      error.value = null
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    }
  }

  /** Elige la opción con esta etiqueta, si existe en la pregunta actual. */
  function answerLabel(label: string) {
    const index = latest?.pending?.question.choices.findIndex((c) => c.label === label) ?? -1
    if (index >= 0) answer(index)
  }

  function quit() {
    set(null, null)
  }

  /** Posiciones a las que se puede volver con cada tipo de deshacer. */
  const undoTargets = computed(() => {
    const marks = history.value?.marks ?? []
    const kinds: UndoKind[] = ['step', 'action', 'turn', 'round']
    return Object.fromEntries(kinds.map((k) => [k, undoTarget(marks, k)])) as Record<
      UndoKind,
      number | null
    >
  })

  /** Vuelve atrás repitiendo las decisiones desde el principio. */
  function undo(kind: UndoKind) {
    const h = history.value
    const target = undoTargets.value[kind]
    if (!h || target === null) return
    const inputs = h.inputs.slice(0, target)
    try {
      const replayed = inputs.reduce((s, input) => applyInput(s, input), h.base)
      set(replayed, { base: h.base, inputs, marks: h.marks.slice(0, target + 1) })
      error.value = null
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    }
  }

  /** Opciones de la pregunta actual agrupadas por el elemento de la mesa al que se refieren. */
  const choicesByTarget = computed(() => {
    const map = new Map<string, IndexedChoice[]>()
    state.value?.pending?.question.choices.forEach((choice, index) => {
      if (!choice.target) return
      const key = targetKey(choice.target)
      map.set(key, [...(map.get(key) ?? []), { index, choice }])
    })
    return map
  })

  /** Opciones sin elemento en la mesa (se muestran como botones). */
  const untargetedChoices = computed(
    () =>
      state.value?.pending?.question.choices
        .map((choice, index) => ({ index, choice }))
        .filter(({ choice }) => !choice.target) ?? [],
  )

  return {
    state,
    error,
    campaign,
    start,
    closeScenario,
    playNext,
    buy,
    abandonCampaign,
    answer,
    answerLabel,
    quit,
    undo,
    undoTargets,
    choicesByTarget,
    untargetedChoices,
  }
})
