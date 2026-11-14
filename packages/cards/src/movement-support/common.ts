// RR: Move, Connections, Effects, Resolving as Much as Possible, Attacks of Opportunity.
import {
  canAffordEntry,
  canEnter,
  getInvestigator,
  getLocation,
  leavingBlocked,
  moveBlocked,
  movementConnections,
  physicalLocation,
  physicalMovementState,
  type AbilityOption,
  type Asset,
  type GameState,
  type Message,
} from '@lcg/engine'
export {
  ask,
  cardName,
  continuation,
  option,
  exhaust,
  spend,
  event,
  registerAdvancedCard as registerPlayerCard,
} from '../advanced-tests/common'
import { ask, continuation, cardName } from '../advanced-tests/common'

export const here = (s: GameState, by: string) => getInvestigator(s, by).location
export const owned = (s: GameState, by: string) =>
  Object.values(s.assets).filter((a) => a.owner === by)
export const neighbors = (s: GameState, by: string) => {
  s = physicalMovementState(s, by)
  const at = physicalLocation(s, by)
  return !at || leavingBlocked(s, at) || moveBlocked(s, by)
    ? []
    : movementConnections(s, at).filter((to) => canEnter(s, by, to) && canAffordEntry(s, to, by))
}
export const distance = (s: GameState, from: string, to: string, move = true): number => {
  const seen = new Set([from]),
    queue: [string, number][] = [[from, 0]]
  for (const [at, n] of queue) {
    if (at === to) return n
    for (const next of move ? movementConnections(s, at) : (s.locations[at]?.connections ?? []))
      if (!seen.has(next)) {
        seen.add(next)
        queue.push([next, n + 1])
      }
  }
  return Infinity
}
export const fast = (a: Asset, then: Message[], suffix = ''): AbilityOption => ({
  key: a.id + ':move' + suffix,
  label: 'ability.advancedTest',
  params: { card: cardName(a.code) },
  actions: 0,
  provokes: false,
  then,
})

export function walk(
  s: GameState,
  by: string,
  code: string,
  data: Record<string, string | number | boolean>,
): Message[] {
  const left = Number(data.left),
    at = physicalLocation(s, by)
  const finish = (): Message[] =>
    getInvestigator(s, by).eliminated
      ? []
      : (JSON.parse(String(data.visited ?? '[]')) as string[])
          .filter((location) => !!s.locations[location])
          .map((location) => ({ type: 'DiscoverClues', investigator: by, location, amount: 1 }))
  if (!left || !at || getInvestigator(s, by).eliminated) return finish()
  const target = String(data.target ?? '')
  const dist = target ? distance(s, at, target) : 0
  if (target && (!Number.isFinite(dist) || at === target)) return finish()
  const choices = neighbors(s, by)
    .filter((to) => !target || distance(s, to, target) === dist - 1)
    .map((to) => {
      const reveal = !getLocation(s, to).revealed
      const more = continuation(code, by, 'walk', {
        ...data,
        left: left - 1,
        ...(data.clues
          ? {
              visited: JSON.stringify([
                ...(JSON.parse(String(data.visited ?? '[]')) as string[]),
                to,
              ]),
            }
          : {}),
      })
      return {
        label: 'choice.location',
        params: { location: getLocation(s, to).name },
        target: { type: 'location' as const, id: to },
        then: [
          {
            type: 'MoveTo' as const,
            investigator: by,
            location: to,
            afterMove: [...(data.stopOnReveal && reveal ? [] : [more])],
          },
        ],
      }
    })
  return choices.length
    ? ask(by, [...choices, ...(data.optional ? [{ label: 'choice.skip', then: [] }] : [])], true)
    : finish()
}
