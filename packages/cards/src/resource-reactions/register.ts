import { registerCounters } from './counters'
import { registerEvents } from './events'
import { registerTestTools } from './test-tools'
import { registerResearchTools } from './research-tools'
import { playerCardBehavior, registerPlayerCard } from '@lcg/engine'
export function registerResourceReaction(code: string): void {
  if (!(
    registerCounters(code) ||
    registerEvents(code) ||
    registerTestTools(code) ||
    registerResearchTools(code)
  ))
    throw new Error('Unreviewed resource reaction: ' + code)
  if (['05233', '07111', '06326'].includes(code)) {
    const b = playerCardBehavior(code)!,
      abilities = b.abilities!
    registerPlayerCard({
      ...b,
      abilities: (s, a, by) => abilities(s, a, by).filter((o) => o.actions > 0),
      fastOptions: (s, a) =>
        abilities(s, a, a.owner)
          .filter((o) => o.actions === 0)
          .map((o) => ({
            key: o.key,
            investigator: a.owner,
            label: o.label,
            ...(o.params ? { params: o.params } : {}),
            ...(o.target ? { target: o.target } : {}),
            then: [...(o.costs ?? []), ...o.then],
          })),
    })
  }
}
