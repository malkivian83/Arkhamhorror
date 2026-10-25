import { accountStorage, notifyLocalChange } from '../account/storage'
import { newAdventure } from '../account/library'
import {
  chooseTransferHeir,
  replaceInvestigator,
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
} from '@lcg/engine'
import { defineStore } from 'pinia'
import { computed, nextTick, shallowRef } from 'vue'
import { markOf, undoTarget, type UndoKind } from '../game/undo'
import {
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
import { choiceTarget } from '../game/choiceTarget'
import { createAdvanceReview, resumedAdvanceReview, type AdvanceFrame } from '../game/advanceReview'
import { createAutoSteps, type AutoStepsReview } from '../game/autoSteps'
import { showAutoSteps } from '../game/autoStepsPreference'

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
      return readSession(accountStorage)
    } catch {
      return { data: session(null, null, null), issue: 'unavailable' as const }
    }
  })()
  const state = shallowRef<GameState | null>(loaded.data.state)
  const history = shallowRef<History | null>(loaded.data.history)
  const advanceReview = shallowRef<AdvanceFrame[]>(
    loaded.data.advanceReview ?? resumedAdvanceReview(loaded.data.state),
  )
  /** Pasos resueltos solos tras la última decisión; solo se muestran, no se guardan. */
  const autoSteps = shallowRef<AutoStepsReview | null>(null)
  const storageIssue = shallowRef<SessionIssue | null>(loaded.issue ?? null)
  const error = shallowRef<string | null>(null)
  /** Campaña en curso: el escenario que se juega es uno de sus escenarios. */
  const campaign = shallowRef<Campaign | null>(loaded.data.campaign)
  if (campaign.value?.log.rewards?.length) useDecksStore().addRewards(campaign.value.log.rewards)

  function persist() {
    try {
      writeSession(
        accountStorage,
        session(latest, history.value, campaign.value, advanceReview.value),
      )
      storageIssue.value = null
      notifyLocalChange('game', exportSession())
    } catch (e) {
      storageIssue.value = e instanceof SessionError ? e.reason : 'unavailable'
    }
  }

  /**
   * Estado más reciente. El que se ve (`state`) puede ir un instante por detrás
   * mientras dura la animación de movimiento; las decisiones usan siempre este.
   */
  let latest = state.value

  function set(
    next: GameState | null,
    nextHistory: History | null,
    review: AdvanceFrame[] = [],
    steps: AutoStepsReview | null = null,
  ) {
    const previous = latest
    latest = next
    history.value = nextHistory
    advanceReview.value = review
    autoSteps.value = steps
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
  function start(
    campaignId: string,
    members: CampaignMember[],
    difficulty: Difficulty,
    boons: import('@lcg/engine').Boon[] = [],
  ) {
    error.value = null
    const next = newCampaign(
      campaignId,
      members,
      difficulty,
      Math.floor(Math.random() * 2 ** 31),
      boons,
      useDecksStore().rewards,
    )
    if (Object.values(next.log.investigators).some((i) => i.xp > 0)) {
      newAdventure()
      setCampaign(next)
      set(null, null)
      return
    }
    const prepared = startScenario(next, Math.floor(Math.random() * 2 ** 32))
    newAdventure()
    setCampaign(next)
    play(prepared)
  }

  /** Guarda el resultado del escenario terminado en la campaña y deja la mesa. */
  function closeScenario() {
    const game = latest
    if (advanceReview.value.length || !campaign.value || !game?.outcome) return
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

  /** Da al investigador elegido una carta cuyo portador dejó la campaña. */
  function chooseHeir(card: CardCode, heir: string) {
    if (!campaign.value || latest) return
    try {
      setCampaign(chooseTransferHeir(campaign.value, card, heir))
      persist()
      error.value = null
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    }
  }

  /** El jugador cuyo investigador dejó la campaña elige otro con un mazo de nivel 0. */
  function replaceMember(leaving: string, member: CampaignMember) {
    if (!campaign.value || latest) return
    try {
      setCampaign(
        replaceInvestigator(campaign.value, leaving, member, Math.floor(Math.random() * 2 ** 31)),
      )
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
    if (advanceReview.value.length || !current?.pending) return
    const input = { investigator: current.pending.investigator, choice: index }
    try {
      const review = createAdvanceReview(current)
      const steps = createAutoSteps(current)
      const next = applyInput(current, input, (before, message, after) => {
        review.observe(before, message, after)
        steps.observe(before, message, after)
      })
      const h = history.value
      set(
        next,
        h && { base: h.base, inputs: [...h.inputs, input], marks: [...h.marks, markOf(next)] },
        review.finish(next),
        // Con el visor desactivado no se abre el resumen de pasos automáticos.
        showAutoSteps.value ? steps.finish(next) : null,
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
      const restored = replay(h.base, inputs)
      set(restored.state, restored.history)
      error.value = null
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    }
  }

  function exportSession() {
    return JSON.stringify(session(latest, history.value, campaign.value, advanceReview.value))
  }

  function acceptAdvance() {
    if (!advanceReview.value.length) return
    advanceReview.value = advanceReview.value.slice(1)
    persist()
  }

  function acceptAutoSteps() {
    autoSteps.value = null
  }

  /** Import is validated and persisted before replacing the visible session. */
  function importSession(raw: string): boolean {
    try {
      const data = decodeSession(raw)
      writeSession(accountStorage, data)
      if (data.campaign?.log.rewards?.length) useDecksStore().addRewards(data.campaign.log.rewards)
      campaign.value = data.campaign
      latest = data.state
      history.value = data.history
      advanceReview.value = data.advanceReview ?? resumedAdvanceReview(data.state)
      autoSteps.value = null
      state.value = data.state
      notifyLocalChange('game', exportSession())
      error.value = null
      storageIssue.value = null
      return true
    } catch (e) {
      storageIssue.value = e instanceof SessionError ? e.reason : 'invalid'
      return false
    }
  }

  /** Opciones de la pregunta actual agrupadas por el elemento de la mesa al que se refieren. */
  const choicesByTarget = computed(() => {
    const map = new Map<string, IndexedChoice[]>()
    state.value?.pending?.question.choices.forEach((choice, index) => {
      const target = choiceTarget(state.value!, choice)
      if (!target) return
      const key = targetKey(target)
      map.set(key, [...(map.get(key) ?? []), { index, choice }])
    })
    return map
  })

  /** Opciones sin elemento en la mesa (se muestran como botones). */
  const untargetedChoices = computed(
    () =>
      state.value?.pending?.question.choices
        .map((choice, index) => ({ index, choice }))
        .filter(({ choice }) => !choiceTarget(state.value!, choice)) ?? [],
  )

  return {
    state,
    error,
    storageIssue,
    campaign,
    advanceReview,
    acceptAdvance,
    autoSteps,
    acceptAutoSteps,
    start,
    closeScenario,
    playNext,
    buy,
    chooseHeir,
    replaceMember,
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
  }
})
