import {
  playerCardDef,
  type EngineObserver,
  type GameState,
  type LabelParams,
  type PhaseStep,
} from '@lcg/engine'

/** Cambio visible en la mesa, ya traducible. */
export interface AutoEffect {
  key: string
  params?: LabelParams
}

/**
 * Paso que el juego ha resuelto sin preguntar: el paso del reglamento, su
 * motivo y los cambios que ha producido en la mesa.
 */
export interface AutoStep {
  kind: 'round' | 'step'
  /** `log.round` o `log.step.*`: el mismo texto que el registro. */
  key: string
  params?: LabelParams
  /** Explicación del paso según el reglamento. */
  reason?: string
  effects: AutoEffect[]
}

export interface AutoStepsReview {
  steps: AutoStep[]
  /** Decisión con la que se detiene la secuencia. */
  next?: { prompt: string; params?: LabelParams; name: string }
}

/** Dentro de este paso todo lo decide el jugador: no es automático. */
const PLAYER_STEPS: PhaseStep[] = ['takeActions']
/** Entradas del registro que ya representan los propios pasos. */
const HEADER_EVENTS = ['log.round', 'log.phase', 'log.lead']

const stepOf = (key: string, params?: LabelParams): AutoStep => ({
  kind: 'step',
  key: `log.step.${key}`,
  ...(params && Object.keys(params).length ? { params } : {}),
  reason: `table.autoSteps.reason.${key}`,
  effects: [],
})

/** Cambios de la mesa entre dos estados consecutivos del motor. */
function effectsBetween(before: GameState, after: GameState): AutoEffect[] {
  const events = after.log.slice(before.log.length)
  const effects: AutoEffect[] = []
  const locationName = (s: GameState, id: string | null) =>
    id ? (s.locations[id]?.name ?? id) : '—'
  const investigatorName = (id: string) =>
    after.investigators.find((i) => i.id === id)?.name ??
    before.investigators.find((i) => i.id === id)?.name ??
    id
  const damaged = new Set(
    events.filter((e) => e.key === 'log.damage').map((e) => String(e.params?.name ?? '')),
  )
  effects.push(
    ...events
      .filter((e) => !e.key.startsWith('log.step.') && !HEADER_EVENTS.includes(e.key))
      .map((e) => ({ key: e.key, ...(e.params ? { params: e.params } : {}) })),
  )

  for (const l of Object.values(after.locations))
    if (l.revealed && before.locations[l.id] && !before.locations[l.id]!.revealed)
      effects.push({
        key: 'table.advanceReview.revealed',
        params: { location: l.name, n: l.clues },
      })

  if (after.doom !== before.doom)
    effects.push({
      key: 'table.advanceReview.doomChange',
      params: { before: before.doom, after: after.doom },
    })

  for (const inv of after.investigators) {
    const old = before.investigators.find((i) => i.id === inv.id)
    if (!old) continue
    const params = { name: inv.name }
    if (inv.actionsRemaining > old.actionsRemaining)
      effects.push({
        key: 'table.autoSteps.actions',
        params: { ...params, n: inv.actionsRemaining },
      })
    for (const stat of ['clues', 'resources', 'damage', 'horror'] as const) {
      // El registro ya dice cuánto daño y horror recibe.
      if (
        old[stat] === inv[stat] ||
        (stat !== 'clues' && stat !== 'resources' && damaged.has(inv.name))
      )
        continue
      effects.push({
        key: `table.advanceReview.${stat}Change`,
        params: { ...params, before: old[stat], after: inv[stat] },
      })
    }
    const drawn = old.deck.length - inv.deck.length
    if (drawn > 0 && inv.hand.length > old.hand.length)
      effects.push({ key: 'table.autoSteps.drew', params: { ...params, n: drawn } })
    const discarded = inv.discard.length - old.discard.length
    if (discarded > 0 && inv.hand.length < old.hand.length)
      effects.push({
        key: 'table.autoSteps.discarded',
        params: { ...params, n: Math.min(discarded, old.hand.length - inv.hand.length) },
      })
    if (old.location !== inv.location)
      effects.push({
        key: 'table.advanceReview.moved',
        params: { ...params, location: locationName(after, inv.location) },
      })
  }

  const defeated = new Set(
    events.filter((e) => e.key.startsWith('log.enemy')).map((e) => String(e.params?.enemy ?? '')),
  )
  for (const e of Object.values(before.enemies))
    if (!after.enemies[e.id] && !defeated.has(e.name))
      effects.push({ key: 'table.autoSteps.enemyLeft', params: { enemy: e.name } })
  for (const e of Object.values(after.enemies)) {
    const old = before.enemies[e.id]
    const params = { enemy: e.name }
    if (!old) {
      effects.push({
        key: 'table.autoSteps.enemySpawned',
        params: { ...params, location: locationName(after, e.location) },
      })
      if (e.engagedWith)
        effects.push({
          key: 'table.autoSteps.enemyEngaged',
          params: { ...params, name: investigatorName(e.engagedWith) },
        })
      continue
    }
    if (old.location !== e.location)
      effects.push({
        key: 'table.autoSteps.enemyMoved',
        params: { ...params, location: locationName(after, e.location) },
      })
    if (old.engagedWith !== e.engagedWith)
      effects.push(
        e.engagedWith
          ? {
              key: 'table.autoSteps.enemyEngaged',
              params: { ...params, name: investigatorName(e.engagedWith) },
            }
          : { key: 'table.autoSteps.enemyDisengaged', params },
      )
    if (old.damageTaken !== e.damageTaken)
      effects.push({
        key: 'table.autoSteps.enemyDamage',
        params: { ...params, before: old.damageTaken, after: e.damageTaken },
      })
    if (old.exhausted !== e.exhausted)
      effects.push({
        key: e.exhausted ? 'table.autoSteps.enemyExhausted' : 'table.autoSteps.enemyReadied',
        params,
      })
  }
  const attacks = (s: GameState) => s.enemyAttacks?.filter((a) => a.round === s.round) ?? []
  for (const a of attacks(after).slice(attacks(before).length))
    effects.push({
      key: 'table.autoSteps.enemyAttacks',
      params: {
        enemy: after.enemies[a.enemy]?.name ?? before.enemies[a.enemy]?.name ?? a.enemy,
        name: investigatorName(a.investigator),
      },
    })

  // Apoyos preparados o agotados, agrupados por investigador.
  const readied = new Map<string, number>()
  for (const a of Object.values(after.assets)) {
    const old = before.assets[a.id]
    if (old?.exhausted && !a.exhausted) readied.set(a.owner, (readied.get(a.owner) ?? 0) + 1)
  }
  for (const [owner, n] of readied)
    effects.push({
      key: 'table.autoSteps.assetsReadied',
      params: { name: investigatorName(owner), n },
    })
  for (const a of Object.values(before.assets))
    if (!after.assets[a.id])
      effects.push({
        key: 'table.autoSteps.cardLeft',
        params: { card: playerCardDef(a.code)?.name ?? a.code },
      })

  for (const t of Object.values(after.treacheries)) {
    const old = before.treacheries[t.id]
    if (t.placement.type === 'limbo' || old?.placement.type === t.placement.type) continue
    const params = { card: t.name }
    if (t.placement.type === 'threatArea')
      effects.push({
        key: 'table.autoSteps.threatArea',
        params: { ...params, name: investigatorName(t.placement.investigator) },
      })
    else if (t.placement.type === 'location')
      effects.push({
        key: 'table.advanceReview.enteredAt',
        params: { ...params, location: locationName(after, t.placement.location) },
      })
  }
  for (const t of Object.values(before.treacheries))
    if (!after.treacheries[t.id] && t.placement.type !== 'limbo')
      effects.push({ key: 'table.autoSteps.cardLeft', params: { card: t.name } })
  return effects
}

/**
 * Recoge, mensaje a mensaje, lo que el motor resuelve solo tras una decisión:
 * cada paso del reglamento con su motivo y sus cambios. Lo que ocurre dentro
 * del turno del jugador (sus acciones) no se recoge: lo ha decidido él.
 */
export function createAutoSteps(initial: GameState) {
  const steps: AutoStep[] = []
  // Si la decisión llega a mitad de un paso automático, el resto sigue en él.
  let current: AutoStep | null =
    initial.phaseStep && !PLAYER_STEPS.includes(initial.phaseStep) && initial.round > 0
      ? stepOf(initial.phaseStep, stepParams(initial, initial.phaseStep))
      : null
  const continued = current
  let automatic = false

  const observe: EngineObserver = (before, message, after) => {
    if (before.round === 0) return
    if (message.type === 'Round') {
      steps.push({ kind: 'round', key: 'log.round', params: { round: after.round }, effects: [] })
      current = null
      return
    }
    if (message.type === 'Step') {
      if (PLAYER_STEPS.includes(message.step)) {
        current = null
        return
      }
      const event = after.log.at(-1)
      current = stepOf(message.step, event?.key === `log.step.${message.step}` ? event.params : {})
      steps.push(current)
      automatic = true
      return
    }
    if (!current) return
    const effects = effectsBetween(before, after)
    if (!effects.length) return
    if (current === continued && !steps.includes(current)) steps.push(current)
    current.effects.push(...effects)
  }

  function finish(after: GameState): AutoStepsReview | null {
    if (!automatic && !steps.some((s) => s.effects.length)) return null
    const review: AutoStepsReview = { steps }
    const pending = after.pending
    if (pending)
      review.next = {
        prompt: pending.question.story?.title ?? pending.question.prompt,
        ...(pending.question.promptParams ? { params: pending.question.promptParams } : {}),
        name: after.investigators.find((i) => i.id === pending.investigator)?.name ?? '',
      }
    return review
  }
  return { observe, finish }
}

/** Nombre del investigador de los pasos de turno al retomar a mitad de uno. */
function stepParams(state: GameState, step: PhaseStep): LabelParams {
  if (step !== 'turnBegins' && step !== 'turnEnds') return {}
  const id = state.activeTurn ?? state.pending?.investigator
  const name = state.investigators.find((i) => i.id === id)?.name
  return name ? { name } : {}
}
