import { playerCardDef, type GameState } from '@lcg/engine'

interface CardFace {
  code: string
  name: string
}
export interface ScenarioTransition {
  kind: 'agenda' | 'act'
  card: CardFace
  nextCard?: CardFace
  effects: GameState['log']
  arrivals: CardFace[]
}

/** Read completed engine events; acknowledgement never changes rules or replay inputs. */
export function scenarioTransitions(before: GameState, after: GameState): ScenarioTransition[] {
  if (before.scenarioId !== after.scenarioId || after.log.length <= before.log.length) return []
  if (!before.log.every((entry, n) => JSON.stringify(entry) === JSON.stringify(after.log[n])))
    return []
  const added = after.log.slice(before.log.length)
  const transitions: ScenarioTransition[] = []
  for (const [n, event] of added.entries()) {
    const kind =
      event.key === 'log.agendaAdvanced' ? 'agenda' : event.key === 'log.actAdvanced' ? 'act' : null
    if (!kind) continue
    const deck = kind === 'agenda' ? before.agendas : before.acts
    const index = deck.findIndex((card) => card.name === event.params?.name)
    const card = deck[index]
    if (!card) continue
    const next = deck[index + 1]
    const end = added.findIndex(
      (other, i) => i > n && ['log.agendaAdvanced', 'log.actAdvanced'].includes(other.key),
    )
    transitions.push({
      kind,
      card: { code: card.code ?? '', name: card.name },
      ...(next ? { nextCard: { code: next.code ?? '', name: next.name } } : {}),
      effects: added
        .slice(n + 1, end < 0 ? undefined : end)
        .filter(
          (entry) =>
            !entry.key.startsWith('log.step.') && !['log.round', 'log.phase'].includes(entry.key),
        ),
      arrivals: [],
    })
  }
  const last = transitions.at(-1)
  if (last) {
    last.arrivals = [
      ...Object.values(after.enemies)
        .filter((e) => !before.enemies[e.id])
        .map((e) => ({ code: e.code, name: e.name })),
      ...Object.values(after.assets)
        .filter((a) => !before.assets[a.id])
        .map((a) => ({ code: a.code, name: playerCardDef(a.code)?.name ?? a.code })),
      ...Object.values(after.locations)
        .filter((l) => !before.locations[l.id])
        .map((l) => ({ code: l.id, name: l.name })),
      ...Object.values(after.placedAssets ?? {})
        .filter((a) => !before.placedAssets?.[a.id])
        .map((a) => ({ code: a.code, name: a.name })),
      ...Object.values(after.stories ?? {})
        .filter((s) => !before.stories?.[s.code])
        .map((s) => ({ code: s.code, name: s.name })),
      ...Object.values(after.treacheries)
        .filter((tr) => tr.placement.type !== 'limbo' && !before.treacheries[tr.id])
        .map((tr) => ({ code: tr.code, name: tr.name })),
    ]
  }
  return transitions
}
