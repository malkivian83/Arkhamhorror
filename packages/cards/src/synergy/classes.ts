import { playerCardDef, type GameState } from '@lcg/engine'
const classes = ['guardian', 'seeker', 'rogue', 'mystic', 'survivor']
// RR: Ability, Limbo, Ownership and Control. Resolving events and committed
// skills are not in play. Attached events keep their own controller.
export function controlledClassTypes(s: GameState, by: string): string[] {
  const cards = [
    by,
    ...Object.values(s.assets)
      .filter((a) => a.owner === by)
      .map((a) => a.code),
    ...Object.values(s.assets).flatMap((a) =>
      (a.upgrades ?? []).filter((u) => u.owner === by).map((u) => u.code),
    ),
  ]
  return [
    ...new Set(
      cards.flatMap((code) => {
        const def = playerCardDef(code)
        return def ? (def.classes ?? [def.class]).filter((c) => classes.includes(c)) : []
      }),
    ),
  ]
}
export function controlledClasses(s: GameState, by: string): number {
  return controlledClassTypes(s, by).length
}
