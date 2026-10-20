import { playerCardDef, type EngineObserver, type GameState, type LabelParams } from '@lcg/engine'

export interface ReviewCard {
  code: string
  name: string
  back?: boolean
  landscape?: boolean
  location?: string
  attachedTo?: string
  controlledBy?: string
  exhausted?: boolean
  /** Carta de plan o de acto, para rotularla en la preparación. */
  deck?: 'act' | 'agenda'
}
export interface AdvanceFrame {
  kind: 'act' | 'agenda'
  card: ReviewCard
  stage:
    | 'setup'
    | 'payment'
    | 'reverse'
    | 'entered'
    | 'left'
    | 'changed'
    | 'effects'
    | 'next'
    | 'decision'
    | 'finished'
  cards: ReviewCard[]
  effects: { key: string; params?: LabelParams }[]
  decision?: { prompt: string; params?: LabelParams; name: string }
}
interface Context {
  kind: AdvanceFrame['kind']
  index: number
  card: ReviewCard
  started: boolean
}
const deck = (s: GameState, kind: Context['kind']) => (kind === 'act' ? s.acts : s.agendas)
const index = (s: GameState, kind: Context['kind']) => (kind === 'act' ? s.actIndex : s.agendaIndex)
function context(s: GameState, kind: Context['kind']): Context | undefined {
  const n = index(s, kind),
    card = deck(s, kind)[n]
  return card
    ? {
        kind,
        index: n,
        card: { code: card.code ?? '', name: card.name, landscape: true },
        started: false,
      }
    : undefined
}
function pendingContext(s: GameState): Context | undefined {
  const marker = s.queue.find(
    (m) =>
      m.type === 'ActAdvanced' ||
      m.type === 'AgendaAdvanced' ||
      (m.type === 'AdvanceAct' && m.paid),
  )
  const c = marker ? context(s, marker.type.includes('Act') ? 'act' : 'agenda') : undefined
  return c && marker ? { ...c, started: marker.type !== 'AdvanceAct' } : undefined
}
const frame = (
  c: Context,
  stage: AdvanceFrame['stage'],
  cards: ReviewCard[] = [],
  effects: AdvanceFrame['effects'] = [],
): AdvanceFrame => ({ kind: c.kind, card: c.card, stage, cards, effects })

function visibleCards(s: GameState): Map<string, ReviewCard> {
  const cards = new Map<string, ReviewCard>()
  const locationName = (id: string) => s.locations[id]?.name ?? id
  const investigatorName = (id: string) => s.investigators.find((i) => i.id === id)?.name ?? id
  for (const e of Object.values(s.enemies))
    cards.set(`enemy:${e.id}`, {
      code: e.code,
      name: e.name,
      location: locationName(e.location),
      exhausted: e.exhausted,
    })
  for (const a of Object.values(s.assets))
    cards.set(`asset:${a.id}`, {
      code: a.code,
      name: playerCardDef(a.code)?.name ?? a.code,
      controlledBy: investigatorName(a.owner),
      exhausted: a.exhausted,
    })
  for (const l of Object.values(s.locations))
    cards.set(`location:${l.id}`, { code: l.id, name: l.name, back: !l.revealed })
  for (const a of Object.values(s.placedAssets ?? {})) {
    // Spellbound cards remain hidden; never reveal their identity in the review.
    if (!a.faceDown)
      cards.set(`placed:${a.id}`, {
        code: a.code,
        name: a.name,
        exhausted: a.exhausted,
        ...(a.placement.type === 'location'
          ? { location: locationName(a.placement.location) }
          : { attachedTo: s.enemies[a.placement.enemy]?.name ?? a.placement.enemy }),
      })
  }
  for (const t of Object.values(s.treacheries))
    if (t.placement.type !== 'limbo')
      cards.set(`treachery:${t.id}`, {
        code: t.code,
        name: t.name,
        ...(t.placement.type === 'location'
          ? { location: locationName(t.placement.location) }
          : { attachedTo: investigatorName(t.placement.investigator) }),
      })
  for (const c of Object.values(s.stories ?? {}))
    cards.set(`story:${c.code}`, { code: c.code, name: c.name })
  return cards
}

/** Cambios de fichas y de localización de cada investigador entre dos estados. */
function investigatorEffects(
  before: GameState,
  after: GameState,
  movedKey = 'table.advanceReview.moved',
): AdvanceFrame['effects'] {
  const effects: AdvanceFrame['effects'] = []
  for (const inv of after.investigators) {
    const old = before.investigators.find((i) => i.id === inv.id)
    if (!old) continue
    for (const stat of ['clues', 'resources', 'damage', 'horror'] as const)
      if (old[stat] !== inv[stat])
        effects.push({
          key: `table.advanceReview.${stat}Change`,
          params: { name: inv.name, before: old[stat], after: inv[stat] },
        })
    if (old.location !== inv.location)
      effects.push({
        key: movedKey,
        params: {
          name: inv.name,
          location: inv.location ? (after.locations[inv.location]?.name ?? inv.location) : '—',
        },
      })
  }
  return effects
}

const IGNORED_EVENTS = ['log.actAdvanced', 'log.agendaAdvanced', 'log.round', 'log.phase']

/**
 * Preparación ya aplicada al empezar el escenario: el plan y el acto iniciales,
 * abiertos, con los pasos automáticos que han dejado la mesa lista.
 */
function setupFrame(start: GameState, end: GameState): AdvanceFrame | null {
  const front = (card: { code?: string; name: string }, deck: 'act' | 'agenda'): ReviewCard => ({
    code: card.code ?? '',
    name: card.name,
    landscape: true,
    deck,
  })
  const agenda = end.agendas[end.agendaIndex],
    act = end.acts[end.actIndex]
  const cards = [agenda && front(agenda, 'agenda'), act && front(act, 'act')].filter(
    (c): c is ReviewCard => !!c,
  )
  if (!cards.length) return null
  const starts = 'table.advanceReview.startsAt'
  const people = investigatorEffects(start, end, starts)
  const effects = people.filter((e) => e.key === starts)
  for (const l of Object.values(end.locations)) {
    const old = start.locations[l.id]
    if (l.revealed && !old?.revealed)
      effects.push({
        key: 'table.advanceReview.revealed',
        params: { location: l.name, n: l.clues },
      })
    else if (!old)
      effects.push({ key: 'table.advanceReview.locationEntered', params: { location: l.name } })
  }
  const oldCards = visibleCards(start)
  for (const [id, card] of visibleCards(end)) {
    if (oldCards.has(id) || id.startsWith('location:')) continue
    const place = card.location
      ? { key: 'enteredAt', params: { location: card.location } }
      : card.controlledBy
        ? { key: 'enteredControlled', params: { name: card.controlledBy } }
        : card.attachedTo
          ? { key: 'enteredAttached', params: { name: card.attachedTo } }
          : { key: 'enteredPlay', params: {} }
    effects.push({
      key: `table.advanceReview.${place.key}`,
      params: { card: card.name, ...place.params },
    })
  }
  if (end.doom !== start.doom)
    effects.push({
      key: 'table.advanceReview.doomChange',
      params: { before: start.doom, after: end.doom },
    })
  effects.push(
    ...end.log
      .slice(start.log.length)
      .filter(
        (e) =>
          !e.key.startsWith('log.step.') && e.key !== 'log.lead' && !IGNORED_EVENTS.includes(e.key),
      )
      .map((e) => ({ key: e.key, ...(e.params ? { params: e.params } : {}) })),
    ...people.filter((e) => e.key !== starts),
  )
  return { kind: cards[0]!.deck!, card: cards[0]!, stage: 'setup', cards, effects }
}

/** Collect actual automatic engine changes, in order, without adding rule decisions. */
export function createAdvanceReview(initial: GameState) {
  const frames: AdvanceFrame[] = []
  const stack: Context[] = []
  const resumed = pendingContext(initial)
  if (resumed) stack.push(resumed)
  // La preparación automática va de la colocación de los investigadores a la primera ronda.
  let setupStart: GameState | null = null
  const observe: EngineObserver = (before, message, after) => {
    if (before.phase === 'setup' && before.round === 0) {
      if (message.type === 'MoveTo') setupStart ??= before
      if (message.type === 'Round') {
        const setup = setupFrame(setupStart ?? initial, before)
        if (setup) frames.push(setup)
      }
    }
    const advancing =
      message.type === 'AdvanceAct' ? 'act' : message.type === 'AdvanceAgenda' ? 'agenda' : null
    if (advancing) {
      const c = context(before, advancing)
      if (c && !stack.some((s) => s.kind === c.kind && s.index === c.index)) stack.push(c)
    }
    const c = stack.at(-1)
    if (!c) return
    const events = after.log.slice(before.log.length)
    const started = events.some((e) => e.key === `log.${c.kind}Advanced`)
    if (started) {
      c.started = true
      frames.push(frame(c, 'reverse'))
    }
    const oldCards = visibleCards(before),
      newCards = visibleCards(after)
    const entered = [...newCards].filter(([id]) => !oldCards.has(id)).map(([, card]) => card)
    const left = [...oldCards].filter(([id]) => !newCards.has(id)).map(([, card]) => card)
    const changed = [...newCards]
      .filter(
        ([id, card]) =>
          oldCards.has(id) && JSON.stringify(oldCards.get(id)) !== JSON.stringify(card),
      )
      .map(([, card]) => card)
    if (left.length) frames.push(frame(c, 'left', left))
    if (entered.length) frames.push(frame(c, 'entered', entered))
    if (changed.length) frames.push(frame(c, 'changed', changed))
    const effects: AdvanceFrame['effects'] = [
      ...events
        .filter((e) => !e.key.startsWith('log.step.') && !IGNORED_EVENTS.includes(e.key))
        .map((e) => ({ key: e.key, ...(e.params ? { params: e.params } : {}) })),
      ...investigatorEffects(before, after),
    ]
    // The card drawn is visible even if its revelation immediately discards it.
    const drawn = events
      .filter((e) => e.key === 'log.encounter' && typeof e.params?.code === 'string')
      .map((e) => ({
        code: String(e.params!.code),
        name: String(e.params!.card ?? e.params!.code),
      }))
    if (effects.length)
      frames.push(
        frame(
          c,
          ['PayGroupClues', 'SpendClues'].includes(message.type) ? 'payment' : 'effects',
          drawn,
          effects,
        ),
      )
    if (message.type === (c.kind === 'act' ? 'ActAdvanced' : 'AgendaAdvanced')) {
      const next =
        index(after, c.kind) > c.index ? deck(after, c.kind)[index(after, c.kind)] : undefined
      frames.push(
        frame(
          c,
          next ? 'next' : 'finished',
          next ? [{ code: next.code ?? '', name: next.name, landscape: true }] : [],
        ),
      )
      stack.pop()
    }
  }
  function finish(after: GameState): AdvanceFrame[] {
    const c =
      stack.at(-1) ??
      (frames.length
        ? { kind: frames.at(-1)!.kind, index: 0, card: frames.at(-1)!.card, started: true }
        : undefined)
    if (!c) return frames
    if (stack.length && after.pending && after.pending.question.prompt !== 'prompt.chooseAction') {
      const question = after.pending.question
      const decision = frame(c, 'decision')
      decision.decision = {
        prompt: question.story?.title ?? question.prompt,
        ...(question.promptParams ? { params: question.promptParams } : {}),
        name: after.investigators.find((i) => i.id === after.pending!.investigator)?.name ?? '',
      }
      frames.push(decision)
    } else if (after.outcome && frames.at(-1)?.stage !== 'finished')
      frames.push(frame(c, 'finished'))
    return frames
  }
  return { observe, finish }
}

/** Older saves can resume in the middle of a reverse-side effect. */
export function resumedAdvanceReview(state: GameState | null): AdvanceFrame[] {
  if (!state) return []
  const c = pendingContext(state)
  if (!c) return []
  const collector = createAdvanceReview(state)
  return [frame(c, c.started ? 'reverse' : 'payment'), ...collector.finish(state)]
}

/** Draws outside the advance still need their usual spotlight after the review. */
export function unreviewedEncounterDraws(log: GameState['log'], frames: AdvanceFrame[]) {
  const reviewed = frames.flatMap((f) =>
    f.effects.filter((e) => e.key === 'log.encounter').map((e) => e.params?.code),
  )
  return log.filter((event) => {
    if (event.key !== 'log.encounter' || typeof event.params?.code !== 'string') return false
    const n = reviewed.indexOf(event.params.code)
    if (n < 0) return true
    reviewed.splice(n, 1)
    return false
  })
}

/** Bounded presentation data; no messages, callbacks or engine state are imported here. */
export function validAdvanceReview(value: unknown): value is AdvanceFrame[] {
  const object = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === 'object' && !Array.isArray(v)
  const text = (v: unknown) => typeof v === 'string' && v.length <= 4000
  const params = (v: unknown) =>
    v === undefined ||
    (object(v) && Object.values(v).every((x) => text(x) || typeof x === 'number'))
  const card = (v: unknown) =>
    object(v) &&
    text(v.code) &&
    text(v.name) &&
    [v.location, v.attachedTo, v.controlledBy].every((x) => x === undefined || text(x)) &&
    (v.exhausted === undefined || typeof v.exhausted === 'boolean') &&
    (v.back === undefined || typeof v.back === 'boolean') &&
    (v.landscape === undefined || typeof v.landscape === 'boolean') &&
    (v.deck === undefined || v.deck === 'act' || v.deck === 'agenda')
  return (
    Array.isArray(value) &&
    value.length <= 250 &&
    value.every(
      (f) =>
        object(f) &&
        ['act', 'agenda'].includes(String(f.kind)) &&
        card(f.card) &&
        [
          'setup',
          'payment',
          'reverse',
          'entered',
          'left',
          'changed',
          'effects',
          'next',
          'decision',
          'finished',
        ].includes(String(f.stage)) &&
        Array.isArray(f.cards) &&
        f.cards.length <= 100 &&
        f.cards.every(card) &&
        Array.isArray(f.effects) &&
        f.effects.length <= 200 &&
        f.effects.every((e) => object(e) && text(e.key) && params(e.params)) &&
        (f.decision === undefined ||
          (object(f.decision) &&
            text(f.decision.prompt) &&
            text(f.decision.name) &&
            params(f.decision.params))),
    )
  )
}
