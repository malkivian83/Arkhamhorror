import { getInvestigator, registerPlayerCard } from '@lcg/engine'

// RR: Skill Tests, Commit Cards. Count the owner's hand, excluding only the
// physical copy leaving that hand; a same-code copy in hand still counts.
export function registerLastChance(code: string, draw: boolean): void {
  registerPlayerCard({
    code,
    exclusiveCommit: true,
    additionalIcons: (s, _t, by, zone = 'hand') => {
      const hand = getInvestigator(s, by).hand
      const leaving = zone === 'hand' && hand.includes(code) ? 1 : 0
      return { wild: -Math.max(0, hand.length - leaving) }
    },
    afterCommittedTest: (_s, _t, success, by) =>
      draw && success ? [{ type: 'DrawCards', investigator: by, amount: 2 }] : [],
  })
}
