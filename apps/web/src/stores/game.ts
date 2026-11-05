import { accountStorage, notifyLocalChange } from '../account/storage'
import { newAdventure } from '../account/library'
import {
  chooseTransferHeir,
  replaceInvestigator,
  finishScenario,
  applyRestfulNightVisit,
  completeRestfulNight,
  type RestfulNightChoice,
  resolveDisappearance,
  resolveExpeditionAttack,
  type AttackDecision,
  type DisappearanceDecision,
  newCampaign,
  purchase,
  customize,
  startScenario,
  addCarnevale,
  DeckProblemError,
  STARTER_DECKS,
  type Campaign,
  type CampaignMember,
  type Difficulty,
  type EncounterSetVariant,
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
  decodeSession,
  readSession,
  refreshBackup,
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
import { createCardEntries, type CardEntry } from '@lcg/shared'

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
  const cardEntries = shallowRef<(CardEntry & { reviewed?: boolean })[]>([])
  const storageIssue = shallowRef<SessionIssue | null>(loaded.issue ?? null)
  const error = shallowRef<string | null>(null)
  /** Datos del error de campaña cuando `error` es una clave de texto (`deck.problem.*`). */
  const errorParams = shallowRef<Record<string, string | number>>({})
  function failed(e: unknown) {
    error.value = e instanceof Error ? e.message : String(e)
    errorParams.value =
      e instanceof DeckProblemError && 'params' in e.problem ? e.problem.params : {}
  }
  /** Campaña en curso: el escenario que se juega es uno de sus escenarios. */
  const campaign = shallowRef<Campaign | null>(loaded.data.campaign)
  if (campaign.value?.log.rewards?.length) useDecksStore().addRewards(campaign.value.log.rewards)

  /** Trusted writes skip the replay: every few, a full check renews the backup (N4). */
  const BACKUP_EVERY = 20
  let trustedWrites = 0
  function scheduleBackup() {
    const run = () => void refreshBackup(accountStorage)
    if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 5000 })
    else setTimeout(run, 0)
  }

  function persist() {
    try {
      // The undo history comes from applying inputs here: no replay on every decision.
      const raw = writeSession(
        accountStorage,
        session(latest, history.value, campaign.value, advanceReview.value),
        { trustedHistory: true },
      )
      storageIssue.value = null
      notifyLocalChange('game', raw)
      if (++trustedWrites % BACKUP_EVERY === 0) scheduleBackup()
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
    cards?: CardEntry[],
  ) {
    const previous = latest
    latest = next
    history.value = nextHistory
    advanceReview.value = review
    autoSteps.value = steps
    const covered = new Set(
      review.flatMap((frame) => [
        frame.card.code,
        ...frame.cards.map((c) => c.code),
        ...frame.effects
          .filter((e) => e.key === 'log.encounter')
          .map((e) => String(e.params?.code ?? '')),
      ]),
    )
    cardEntries.value = cards
      ? [
          ...cardEntries.value,
          ...cards.map((card) => ({
            ...card,
            ...(covered.has(card.code) ? { reviewed: true } : {}),
          })),
        ]
      : []
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
    openingScenario?: string,
    encounterSetVariant?: EncounterSetVariant,
  ) {
    error.value = null
    const next = newCampaign(
      campaignId,
      members,
      difficulty,
      Math.floor(Math.random() * 2 ** 31),
      boons,
      useDecksStore().rewards,
      openingScenario,
      encounterSetVariant,
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
    // A deck that cannot start (doc 100, C4) is reported instead of failing silently.
    try {
      play(startScenario(campaign.value, Math.floor(Math.random() * 2 ** 32)))
    } catch (e) {
      failed(e)
    }
  }

  function chooseDisappearance(decision: DisappearanceDecision) {
    if (!campaign.value || latest) return
    setCampaign(resolveDisappearance(campaign.value, decision))
    persist()
  }

  function chooseExpeditionAttack(decision: AttackDecision) {
    if (!campaign.value || latest) return
    setCampaign(resolveExpeditionAttack(campaign.value, decision))
    persist()
  }

  function visitRestfulNight(choice: RestfulNightChoice) {
    if (!campaign.value || latest) return
    setCampaign(applyRestfulNightVisit(campaign.value, choice))
    persist()
  }

  function closeRestfulNight(route: 'mirage' | 'peaks') {
    if (!campaign.value || latest) return
    setCampaign(completeRestfulNight(campaign.value, route))
    persist()
  }

  function insertCarnevale() {
    if (!campaign.value || latest) return
    setCampaign(addCarnevale(campaign.value))
  }

  /** Gasta experiencia en una carta para el mazo de un investigador. */
  function customizeCard(
    investigator: string,
    code: string,
    sheet: Record<string, number>,
    options: { copies?: number; remove?: string[] } = {},
  ) {
    if (!campaign.value || state.value) return
    try {
      setCampaign(customize(campaign.value, investigator, code, sheet, options))
      error.value = null
    } catch (e) {
      failed(e)
    }
  }

  function buy(
    investigator: string,
    card: CardCode,
    options: { remove?: CardCode; upgrade?: boolean; replaces?: CardCode } = {},
  ) {
    if (!campaign.value || latest) return
    try {
      setCampaign(purchase(campaign.value, investigator, card, options))
      persist()
      error.value = null
    } catch (e) {
      failed(e)
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
    answerSequence((_, n) => (n === 0 ? index : null))
  }

  /**
   * Answers several questions in a row as one table update: `pick` gets each new state and
   * returns the choice to make, or null to stop and leave the question to the player
   * (damage assignment, doc 100, D4).
   */
  function answerSequence(pick: (state: GameState, step: number) => number | null) {
    const current = latest
    if (advanceReview.value.length || !current?.pending) return
    // During the movement transition the table still shows the previous question: an index
    // chosen there (click or 1-9/D/R) would answer a different one. Ignore it until it lands.
    if (state.value !== current) return
    try {
      const review = createAdvanceReview(current)
      const steps = createAutoSteps(current)
      const cards = createCardEntries()
      const h = history.value
      const inputs: PlayerInput[] = []
      const marks: ReturnType<typeof markOf>[] = []
      let next = current
      for (let index = pick(next, 0); index !== null && next.pending;) {
        const input = { investigator: next.pending.investigator, choice: index }
        next = applyInput(next, input, (before, message, after) => {
          review.observe(before, message, after)
          steps.observe(before, message, after)
          cards.observe(before, message, after)
        })
        inputs.push(input)
        marks.push(markOf(next))
        if (h) remember(h.base, h.inputs.length + inputs.length, next)
        index = next.pending && !next.outcome ? pick(next, inputs.length) : null
      }
      if (!inputs.length) return
      set(
        next,
        h && { base: h.base, inputs: [...h.inputs, ...inputs], marks: [...h.marks, ...marks] },
        review.finish(next),
        // Con el visor desactivado no se abre el resumen de pasos automáticos.
        showAutoSteps.value ? steps.finish(next) : null,
        cards.finish(),
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
  /**
   * States every `CHECKPOINT` decisions of the current history, kept in memory only, so
   * undo replays from the nearest one instead of from the start (doc 100, O3).
   */
  const CHECKPOINT = 25
  let checkpointBase: GameState | null = null
  const checkpoints = new Map<number, GameState>()
  function remember(base: GameState, inputs: number, state: GameState) {
    if (base !== checkpointBase) {
      checkpoints.clear()
      checkpointBase = base
    }
    if (inputs % CHECKPOINT === 0) checkpoints.set(inputs, state)
  }

  /** Vuelve atrás repitiendo las decisiones desde el punto de control más cercano. */
  function undo(kind: UndoKind) {
    const h = history.value
    const target = undoTargets.value[kind]
    if (!h || target === null) return
    try {
      if (h.base !== checkpointBase) {
        checkpoints.clear()
        checkpointBase = h.base
      }
      const from = Math.max(0, ...[...checkpoints.keys()].filter((n) => n <= target))
      let state = from ? checkpoints.get(from)! : h.base
      // Replaying also leaves checkpoints behind (loaded games start without any).
      for (let n = from; n < target; n++) {
        state = applyInput(state, h.inputs[n]!)
        if ((n + 1) % CHECKPOINT === 0) checkpoints.set(n + 1, state)
      }
      for (const n of [...checkpoints.keys()]) if (n > target) checkpoints.delete(n)
      // Replays are deterministic: the undo marks up to `target` are still valid.
      set(state, {
        base: h.base,
        inputs: h.inputs.slice(0, target),
        marks: h.marks.slice(0, target + 1),
      })
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
    if (!advanceReview.value.length)
      cardEntries.value = cardEntries.value.filter((card) => !card.reviewed)
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
    errorParams,
    storageIssue,
    campaign,
    advanceReview,
    acceptAdvance,
    autoSteps,
    cardEntries,
    acceptCardEntry() {
      cardEntries.value = cardEntries.value.slice(1)
    },
    acceptAutoSteps,
    start,
    closeScenario,
    playNext,
    insertCarnevale,
    visitRestfulNight,
    closeRestfulNight,
    chooseDisappearance,
    chooseExpeditionAttack,
    buy,
    customizeCard,
    chooseHeir,
    replaceMember,
    abandonCampaign,
    answer,
    answerSequence,
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
