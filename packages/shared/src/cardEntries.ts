import { playerCardDef, printedCode, type EngineObserver } from '@lcg/engine'

/** Visible card only. No concealed identity, engine message or deferred effect. */
export interface CardEntry {
  code: string
  name: string
  target?: string
  back?: boolean
  landscape?: boolean
  reason: 'draw' | 'enter' | 'reveal'
  investigator?: string
  from?: 'masked' | 'encounter' | 'player'
}

/**
 * Whether an entry stops the table with a modal. Encounter draws, cards turned from a hidden
 * back (Carnevale masks, player backs), and enemies or treacheries that arrive need a read;
 * the player's own assets, locations entering or revealed by moving, acts, agendas and
 * stories are shown briefly without asking for a click.
 */
export function needsSpotlight(entry: CardEntry): boolean {
  if (entry.reason === 'draw' || entry.from) return true
  const target = entry.target ?? ''
  return target.startsWith('enemy:') || target.startsWith('treachery:')
}

/** Collect intermediate entries as well as cards which remain in the final state. */
export function createCardEntries() {
  const entries: CardEntry[] = []
  const removedBacks = new Map<string, 'masked' | 'player'>()
  const transfers = new Map<string, number>()
  const moving = (code: string) => transfers.set(code, (transfers.get(code) ?? 0) + 1)
  const transferred = (code: string) => {
    const n = transfers.get(code) ?? 0
    if (n) transfers.set(code, n - 1)
    return n > 0
  }
  const add = (entry: CardEntry) => {
    const draw = entries.find((e) => e.reason === 'draw' && !e.target && e.code === entry.code)
    if (draw && entry.target) {
      Object.assign(draw, { target: entry.target })
      return
    }
    entries.push(entry)
  }
  const observe: EngineObserver = (before, message, after) => {
    if (message.type === 'TakeControlOfPlaced') {
      const old = before.placedAssets?.[message.placed]
      if (old && !old.faceDown && !after.placedAssets?.[old.id]) moving(old.code)
    }
    if (message.type === 'ReleaseAsset') {
      const old = before.assets[message.asset]
      if (old && !after.assets[old.id]) moving(old.code)
    }
    for (const event of after.log.slice(before.log.length))
      if (
        event.key === 'log.encounter' &&
        typeof event.params?.code === 'string' &&
        event.params.code
      )
        entries.push({
          code: event.params.code,
          name: String(event.params.card ?? event.params.code),
          reason: 'draw',
          investigator: String(event.params.name ?? ''),
          from: 'encounter',
        })
    const revealedBack = () =>
      after.scenarioId === 'carnevale-of-horrors' ? ('masked' as const) : ('player' as const)
    for (const p of Object.values(before.placedAssets ?? {}))
      if (
        p.faceDown &&
        p.placement.type === 'location' &&
        !after.placedAssets?.[p.id] &&
        !Object.values(after.placedAssets ?? {}).some(
          (a) =>
            a.faceDown &&
            a.placement.type === 'location' &&
            a.placement.location === (p.placement.type === 'location' ? p.placement.location : ''),
        )
      )
        removedBacks.set(p.placement.location, revealedBack())
    for (const e of Object.values(after.enemies)) {
      if (before.enemies[e.id]?.code === e.code) continue
      const flipped = Object.values(before.placedAssets ?? {}).find(
        (p) =>
          p.faceDown &&
          p.placement.type === 'location' &&
          p.placement.location === e.location &&
          !after.placedAssets?.[p.id],
      )
      const from = flipped ? revealedBack() : removedBacks.get(e.location)
      if (from) removedBacks.delete(e.location)
      add({
        code: e.code,
        name: e.name,
        target: `enemy:${e.id}`,
        reason: from ? 'reveal' : 'enter',
        ...(from ? { from } : {}),
      })
    }
    for (const a of Object.values(after.assets)) {
      const old = before.assets[a.id] ?? before.placedAssets?.[a.id]
      if (old?.code === a.code && !('faceDown' in old && old.faceDown)) continue
      if (transferred(a.code)) continue
      add({
        code: a.code,
        name: playerCardDef(a.code)?.name ?? a.code,
        target: `asset:${a.id}`,
        reason: 'enter',
      })
    }
    for (const a of Object.values(after.placedAssets ?? {})) {
      const old = before.placedAssets?.[a.id] ?? before.assets[a.id]
      if (a.faceDown || !a.code || (old?.code === a.code && !('faceDown' in old && old.faceDown)))
        continue
      const flipped = !!old && 'faceDown' in old && !!old.faceDown
      if (!flipped && transferred(a.code)) continue
      add({
        code: a.code,
        name: a.name,
        target: `placed:${a.id}`,
        reason: flipped ? 'reveal' : 'enter',
        ...(flipped ? { from: revealedBack() } : {}),
      })
    }
    for (const t of Object.values(after.treacheries)) {
      if (!t.code || t.hidden || t.placement.type === 'limbo') continue
      const old = before.treacheries[t.id]
      if (old && old.placement.type !== 'limbo' && old.code === t.code) continue
      add({ code: t.code, name: t.name, target: `treachery:${t.id}`, reason: 'enter' })
    }
    for (const l of Object.values(after.locations)) {
      const old = before.locations[l.id]
      if (old && (!l.revealed || old.revealed)) continue
      add({
        code: printedCode(l.id),
        name: l.revealed ? l.name : (l.unrevealedName ?? printedCode(l.id)),
        target: `location:${l.id}`,
        back: !l.revealed,
        reason: old ? 'reveal' : 'enter',
      })
    }
    for (const story of Object.values(after.stories ?? {}))
      if (!before.stories?.[story.code] || before.stories[story.code]?.code !== story.code)
        add({ code: story.code, name: story.name, target: `story:${story.code}`, reason: 'enter' })
    for (const kind of ['act', 'agenda'] as const) {
      const old = kind === 'act' ? before.acts[before.actIndex] : before.agendas[before.agendaIndex]
      const card = kind === 'act' ? after.acts[after.actIndex] : after.agendas[after.agendaIndex]
      if (card?.code && old?.code !== card.code)
        add({ code: card.code, name: card.name, target: kind, landscape: true, reason: 'enter' })
    }
    const oldSecond = before.secondAgenda?.agendas[before.secondAgenda.index]
    const second = after.secondAgenda?.agendas[after.secondAgenda.index]
    if (second?.code && oldSecond?.code !== second.code)
      add({
        code: second.code,
        name: second.name,
        target: 'agenda',
        landscape: true,
        reason: 'enter',
      })
  }
  return { observe, finish: () => entries }
}
