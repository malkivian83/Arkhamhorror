import { playerCardDef, registerPlayerCard, treacheryBehavior, type GameState } from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'

// RR: In Play, Weakness, Cannot. Hidden cards and unresolved revelations are
// not in play; Alter Fate never cancels a revelation or discards a weakness.
export function alterFateTargets(s: GameState) {
  return Object.values(s.treacheries).filter(
    (t) =>
      t.placement.type !== 'limbo' &&
      !t.hidden &&
      !t.owner &&
      !playerCardDef(t.code)?.weakness &&
      !treacheryBehavior(t.code)?.cannotDiscard &&
      (t.placement.type !== 'enemy' || !s.enemies[t.placement.enemy]?.traits?.includes('Elite')),
  )
}

export function registerAlterFate(code: string, fast: boolean) {
  registerPlayerCard({
    code,
    ...(fast ? { playInAnyFastWindow: true } : {}),
    canPlay: (s) => alterFateTargets(s).length > 0,
    play: (s, by) =>
      ask(
        by,
        alterFateTargets(s).map((t) => ({
          label: 'choice.groupedTreachery',
          params: { card: t.name },
          target: { type: 'treachery' as const, id: t.id },
          then: [{ type: 'DiscardTreachery' as const, treachery: t.id }],
        })),
        true,
      ),
  })
}
