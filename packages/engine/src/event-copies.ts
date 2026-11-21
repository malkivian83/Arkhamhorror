// RR: Copy, Play, Replacement Effects, Leaves Play; FAQ Painted World, 21 September 2022.
import { playerCardBehavior, playerCardDef } from './content'
import { canPlayByEffect, copyChoices } from './actions'
import { copyPreview, copyTargets } from './event-copy-source'
export { resolvingCopy } from './event-copy-source'
export { copyChoices }
import { getInvestigator, newId, push, updateInvestigator } from './state'
import type { GameState, Message, ReactionOption, Trigger } from './types'
export function copyHandReactions(
  s: GameState,
  t: Trigger,
  by: string,
  physical: string,
): ReactionOption[] {
  return copyTargets(s, by, physical).flatMap((as) => {
    const preview = copyPreview(s, by, physical, as)
    return (playerCardBehavior(as)?.handReactions?.(preview, t, by) ?? [])
      .filter((o) => {
        const p = o.then[0]
        return (
          p?.type === 'PlayCard' &&
          p.code === as &&
          canPlayByEffect(
            preview,
            by,
            as,
            'hand',
            p.noCost,
            p.discount,
            p.additionalActionsPaid,
            true,
            true,
          )
        )
      })
      .map((o) => ({
        ...o,
        key: o.key + ':copy:' + physical,
        label: 'ability.playEventCopy',
        params: {
          card: playerCardDef(as)?.name ?? as,
          physical: playerCardDef(physical)?.name ?? physical,
        },
        target: { type: 'hand' as const, code: physical },
        then: bind(o.then, by, physical, as),
      }))
  })
}
function bind(messages: Message[], by: string, physical: string, as: string): Message[] {
  const visit = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(visit)
    if (!v || typeof v !== 'object') return v
    const x = v as Record<string, unknown>,
      out = Object.fromEntries(Object.entries(x).map(([k, a]) => [k, visit(a)]))
    return x.type === 'PlayCard' && x.investigator === by && x.code === as
      ? { ...out, code: physical, copyAs: as }
      : out
  }
  return visit(messages) as Message[]
}
export function prepareCopyPlay(
  s: GameState,
  m: Extract<Message, { type: 'PlayCard' }>,
): GameState | undefined {
  if (!playerCardBehavior(m.code)?.copyEvents) return undefined
  const i = getInvestigator(s, m.investigator)
  if (!i.hand.includes(m.code)) return s
  const choices = copyTargets(s, i.id, m.code).filter((as) => {
    if (!m.effect && !playerCardBehavior(as)?.play) return false
    if (m.fastWindow && !copyChoices(s, i.id, m.code, true, m.anyFastWindow).includes(as))
      return false
    return canPlayByEffect(
      copyPreview(s, i.id, m.code, as),
      i.id,
      as,
      'hand',
      m.noCost,
      m.discount,
      m.additionalActionsPaid,
      true,
      !!m.asFast,
    )
  })
  if (m.copyAs) {
    if (!choices.includes(m.copyAs)) return s
    const { copyAs, ...play } = m
    return push(s, {
      type: 'BeginEventCopy',
      investigator: i.id,
      physical: m.code,
      as: copyAs,
      then: [{ ...play, code: copyAs }],
    })
  }
  if (!choices.length) return s
  return push(s, {
    type: 'Ask',
    investigator: i.id,
    question: {
      kind: 'chooseOne',
      alwaysAsk: true,
      prompt: 'prompt.chooseEventCopy',
      choices: choices.map((as) => ({
        label: 'choice.eventCopy',
        params: { card: playerCardDef(as)?.name ?? as },
        then: [{ ...m, copyAs: as }],
      })),
    },
  })
}
export function handleCopy(s: GameState, m: Message): GameState | undefined {
  if (m.type === 'BeginEventCopy') {
    if (
      !getInvestigator(s, m.investigator).hand.includes(m.physical) ||
      !copyTargets(s, m.investigator, m.physical).includes(m.as)
    )
      return s
    const [id, next] = newId(copyPreview(s, m.investigator, m.physical, m.as), 'event-copy-')
    return push(
      {
        ...next,
        hasEventCopies: true,
        eventCopies: [
          ...(s.eventCopies ?? []),
          { id, investigator: m.investigator, physical: m.physical, as: m.as, paid: false },
        ],
      },
      ...rebaseSource(m.then, m.physical, m.as),
      { type: 'EndEventCopy', id },
    )
  }
  if (m.type === 'EndEventCopy') {
    const f = s.eventCopies?.find((x) => x.id === m.id)
    if (!f) return s
    let next = s
    if (!f.paid) {
      const i = getInvestigator(s, f.investigator),
        at = i.hand.lastIndexOf(f.as)
      if (at >= 0)
        next = updateInvestigator(s, i.id, (x) => ({
          ...x,
          hand: x.hand.map((c, n) => (n === at ? f.physical : c)),
        }))
    }
    return { ...next, eventCopies: (next.eventCopies ?? []).filter((x) => x.id !== m.id) }
  }
  return undefined
}
/** Track in-play copies separately from the physical event. Their copied text expires on leaving. */
export function settleCopies(before: GameState, after: GameState, message: Message): GameState {
  if (!before.hasEventCopies && !after.hasEventCopies) return after
  let next = after
  const former = collect(before),
    current = collect(after)
  // A self-attaching event is sourced directly from the resolving physical copy, never another discard.
  for (const frame of after.eventCopies ?? []) {
    if (!frame.paid || frame.destination || frame.id !== message.eventCopy) continue
    const add = <
      T extends {
        code: string
        owner?: string
        physicalCopy?: { id: string; code: string }
      },
    >(
      a: T,
    ): T =>
      a.code === frame.as && a.owner === frame.investigator && !a.physicalCopy
        ? { ...a, physicalCopy: { id: frame.id, code: frame.physical } }
        : a
    let found = false
    const assets = Object.fromEntries(
      Object.entries(next.assets).map(([id, a]) => {
        const upgrades = a.upgrades?.map((u, n) => {
          const v = before.assets[id]?.upgrades?.[n] === u ? u : add(u)
          if (v !== u) found = true
          return v
        })
        const v = before.assets[id] ? a : add(a)
        if (v !== a) found = true
        return [id, { ...v, ...(upgrades ? { upgrades } : {}) }]
      }),
    )
    const treacheries = Object.fromEntries(
      Object.entries(next.treacheries).map(([id, t]) => {
        const v = before.treacheries[id] ? t : add(t)
        if (v !== t) found = true
        return [id, v]
      }),
    )
    const locationAttachments = Object.fromEntries(
      Object.entries(next.locationAttachments ?? {}).map(([id, a]) => {
        const v = before.locationAttachments?.[id] ? a : add(a)
        if (v !== a) found = true
        return [id, v]
      }),
    )
    if (found)
      next = {
        ...next,
        assets,
        treacheries,
        locationAttachments,
        eventCopies: (next.eventCopies ?? []).map((f) =>
          f.id === frame.id ? { ...f, destination: 'play' } : f,
        ),
      }
  }
  for (const [id, a] of former) {
    if (current.has(id) || collect(next).has(id)) continue
    next = {
      ...next,
      eventCopies: (next.eventCopies ?? []).map((f) => {
        if (f.id !== id || f.destination !== 'play') return f
        const { destination: _left, ...rest } = f
        return rest
      }),
    }
    for (const inv of next.investigators) {
      const old = before.investigators.find((i) => i.id === inv.id)
      if (!old) continue
      for (const zone of ['hand', 'deck', 'discard'] as const) {
        if (
          inv[zone].filter((c) => c === a.code).length <=
          old[zone].filter((c) => c === a.code).length
        )
          continue
        const at = inv[zone].lastIndexOf(a.code)
        next = updateInvestigator(next, inv.id, (i) => ({
          ...i,
          [zone]: i[zone].flatMap((c, n) =>
            n === at ? (zone === 'discard' ? [] : [a.physicalCopy!.code]) : [c],
          ),
        }))
        break
      }
    }
  }
  return next
}
function collect(s: GameState) {
  const rows = [
    ...Object.values(s.assets),
    ...Object.values(s.assets).flatMap((a) => a.upgrades ?? []),
    ...Object.values(s.treacheries),
    ...Object.values(s.locationAttachments ?? {}),
  ]
  return new Map(rows.filter((a) => a.physicalCopy).map((a) => [a.physicalCopy!.id, a]))
}

/** The copied event establishes its own source after selection, including inline reaction effects. */
function rebaseSource(messages: Message[], physical: string, as: string): Message[] {
  const name = playerCardDef(physical)?.name
  const visit = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(visit)
      : v && typeof v === 'object'
        ? Object.fromEntries(
            Object.entries(v).map(([k, x]) => [
              k,
              k === 'effectSource' && (x === physical || x === name) ? as : visit(x),
            ]),
          )
        : v
  return visit(messages) as Message[]
}
