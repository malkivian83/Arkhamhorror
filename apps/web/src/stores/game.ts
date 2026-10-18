import {
  finishScenario,
  newCampaign,
  purchase,
  startScenario,
  STARTER_DECKS,
  type Campaign,
  type CampaignMember,
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
import { markOf, undoTarget, type UndoKind } from '../game/undo'
import {
  BACKUP_KEY,
  RECOVERY_KEY,
  decodeSession,
  readSession,
  replay,
  session,
  SessionError,
  writeSession,
  type History,
  type SessionIssue,
} from '../game/session'
import { useDecksStore } from './decks'

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
    case 'story':
    case 'placed':
      return `${target.type}:${target.id}`
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
export const useGameStore = defineStore('game', () => {
  const loaded = (() => {
    try {
      return readSession(localStorage)
    } catch {
      return { data: session(null, null, null), issue: 'unavailable' as const }
    }
  })()
  const state = shallowRef<GameState | null>(loaded.data.state)
  const history = shallowRef<History | null>(loaded.data.history)
  const storageIssue = shallowRef<SessionIssue | null>(loaded.issue ?? null)
  const error = shallowRef<string | null>(null)
  /** Campaña en curso: el escenario que se juega es uno de sus escenarios. */
  const campaign = shallowRef<Campaign | null>(loaded.data.campaign)
  if (campaign.value?.log.rewards?.length) useDecksStore().addRewards(campaign.value.log.rewards)
  const failedInput = shallowRef<PlayerInput | null>(null)

  function persist() {
    try {
      writeSession(localStorage, session(latest, history.value, campaign.value))
      storageIssue.value = null
    } catch (e) {
      storageIssue.value = e instanceof SessionError ? e.reason : 'unavailable'
    }
  }

  /**
   * Estado más reciente. El que se ve (`state`) puede ir un instante por detrás
   * mientras dura la animación de movimiento; las decisiones usan siempre este.
   */
  let latest = state.value

  function set(next: GameState | null, nextHistory: History | null) {
    const previous = latest
    latest = next
    history.value = nextHistory
    persist()
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
  }

  function play(game: GameState) {
    set(game, { base: game, inputs: [], marks: [markOf(game)] })
  }

  /** Empieza una campaña nueva con su primer escenario. */
  function start(campaignId: string, members: CampaignMember[], difficulty: Difficulty) {
    error.value = null
    const next = newCampaign(campaignId, members, difficulty, Math.floor(Math.random() * 2 ** 31))
    const prepared = startScenario(next, Math.floor(Math.random() * 2 ** 32))
    setCampaign(next)
    play(prepared)
  }

  /** Guarda el resultado del escenario terminado en la campaña y deja la mesa. */
  function closeScenario() {
    const game = latest
    if (!campaign.value || !game?.outcome) return
    const next = finishScenario(campaign.value, game)
    // Las recompensas ganadas quedan disponibles para mazos nuevos.
    useDecksStore().addRewards(next.log.rewards ?? [])
    setCampaign(next)
    set(null, null)
  }

  /** Empieza el siguiente escenario de la campaña. */
  function playNext() {
    if (!campaign.value || latest) return
    error.value = null
    play(startScenario(campaign.value, Math.floor(Math.random() * 2 ** 32)))
  }

  /** Gasta experiencia en una carta para el mazo de un investigador. */
  function buy(
    investigator: string,
    card: CardCode,
    options: { remove?: CardCode; upgrade?: boolean } = {},
  ) {
    if (!campaign.value || latest) return
    try {
      setCampaign(purchase(campaign.value, investigator, card, options))
      persist()
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
      failedInput.value = null
      const h = history.value
      set(
        next,
        h && { base: h.base, inputs: [...h.inputs, input], marks: [...h.marks, markOf(next)] },
      )
      error.value = null
    } catch (e) {
      failedInput.value = input
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
      const restored = replay(h.base, inputs)
      set(restored.state, restored.history)
      error.value = null
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    }
  }

  function exportSession() {
    return JSON.stringify(session(latest, history.value, campaign.value))
  }

  /** Import is validated and persisted before replacing the visible session. */
  function importSession(raw: string): boolean {
    try {
      const data = decodeSession(raw)
      writeSession(localStorage, data)
      if (data.campaign?.log.rewards?.length) useDecksStore().addRewards(data.campaign.log.rewards)
      campaign.value = data.campaign
      latest = data.state
      history.value = data.history
      state.value = data.state
      error.value = null
      storageIssue.value = null
      return true
    } catch (e) {
      storageIssue.value = e instanceof SessionError ? e.reason : 'invalid'
      return false
    }
  }

  function restoreBackup(): boolean {
    try {
      const raw = localStorage.getItem(BACKUP_KEY)
      if (!raw) throw new SessionError('invalid')
      return importSession(raw)
    } catch {
      storageIssue.value = 'invalid'
      return false
    }
  }

  function diagnostic() {
    let preservedSave: string | null = null
    try {
      preservedSave = localStorage.getItem(RECOVERY_KEY)
    } catch {
      /* Storage warning is already visible. */
    }
    return JSON.stringify(
      {
        format: 'lcg-diagnostic',
        version: 1,
        session: JSON.parse(exportSession()),
        error: error.value,
        storageIssue: storageIssue.value,
        failedInput: failedInput.value,
        preservedSave,
      },
      null,
      2,
    )
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
    storageIssue,
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
    exportSession,
    importSession,
    restoreBackup,
    diagnostic,
  }
})
