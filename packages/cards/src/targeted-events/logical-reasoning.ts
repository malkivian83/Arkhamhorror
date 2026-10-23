import {
  getInvestigator,
  registerPlayerCard,
  treacheryBehavior,
  type Choice,
  type GameState,
  type InvestigatorId,
  type Treachery,
} from '@lcg/engine'
import { ask, continuation } from '../dunwich-pilot/effects'

const here = (s: GameState, by: InvestigatorId) => {
  const location = getInvestigator(s, by).location
  return location === null
    ? []
    : s.investigators.filter((i) => !i.eliminated && i.location === location)
}
const terrors = (s: GameState) =>
  Object.values(s.treacheries).filter(
    (t) => t.traits?.includes('Terror') && !treacheryBehavior(t.code)?.cannotDiscard,
  )
const inThreatArea = (t: Treachery, by: InvestigatorId) =>
  t.placement.type === 'threatArea' && t.placement.investigator === by
const terrorsHere = (s: GameState, by: InvestigatorId) => {
  const location = getInvestigator(s, by).location
  if (location === null) return []
  return terrors(s).filter((t) => {
    const p = t.placement
    if (p.type === 'location') return p.location === location
    if (p.type === 'enemy') return s.enemies[p.enemy]?.location === location
    return p.type === 'threatArea' && here(s, by).some((i) => i.id === p.investigator)
  })
}
const heal = (id: string, name: string): Choice => ({
  label: 'ability.healHorror',
  params: { card: name, n: 2 },
  target: { type: 'investigator', id },
  then: [{ type: 'Heal', investigator: id, damage: 0, horror: 2 }],
})
const discard = (t: Treachery): Choice => ({
  label: 'ability.discardTreachery',
  params: { card: t.name },
  target: { type: 'treachery', id: t.id },
  then: [{ type: 'DiscardTreachery', treachery: t.id }],
})
// RR: Choose, Healing, Threat Area, Cannot. Level 0 delegates the decision to
// the chosen investigator; level 4 grants up to three independent resolutions.
export function registerLogicalReasoning(code: string, upgraded: boolean): void {
  registerPlayerCard({
    code,
    canPlay: (s, by) =>
      getInvestigator(s, by).clues > 0 &&
      (here(s, by).some((i) => i.horror > 0) ||
        (upgraded
          ? terrorsHere(s, by).length > 0
          : terrors(s).some((t) => here(s, by).some((i) => inThreatArea(t, i.id))))),
    play: (s, by) =>
      upgraded
        ? [
            continuation(code, by, 'repeat', {
              remaining: Math.min(3, getInvestigator(s, by).clues),
            }),
          ]
        : ask(
            by,
            here(s, by)
              .filter((i) => i.horror > 0 || terrors(s).some((t) => inThreatArea(t, i.id)))
              .map((i) => ({
                label: 'choice.investigator',
                params: { name: i.name },
                target: { type: 'investigator', id: i.id },
                then: [continuation(code, by, 'target', { target: i.id })],
              })),
          ),
    effect: (s, by, step, data) => {
      if (step === 'target') {
        const i = here(s, by).find((i) => i.id === String(data.target))
        return i
          ? ask(i.id, [
              ...(i.horror > 0 ? [heal(i.id, i.name)] : []),
              ...terrors(s)
                .filter((t) => inThreatArea(t, i.id))
                .map(discard),
            ])
          : []
      }
      const remaining = Number(data.remaining)
      if (step !== 'repeat' || remaining <= 0) return []
      const next = continuation(code, by, 'repeat', { remaining: remaining - 1 })
      const choices = [
        ...here(s, by)
          .filter((i) => i.horror > 0)
          .map((i) => heal(i.id, i.name)),
        ...terrorsHere(s, by).map(discard),
      ]
      return ask(
        by,
        choices.map((c) => ({ ...c, then: [...c.then, next] })),
      )
    },
  })
}
