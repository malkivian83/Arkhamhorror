// RR: Additional Costs, Additional Actions, Lasting Effects, Your Turn.
import { getInvestigator, registerPlayerCard } from '@lcg/engine'
import { atLocation } from '../dunwich-pilot/helpers'
import { ask } from '../dunwich-pilot/effects'
export function registerNextTurnBenefit(code: string): void {
  if (code === '10129') {
    registerPlayerCard({
      code,
      additionalPlayActions: 1,
      play: (_s, by) => [{ type: 'NextTurnBenefits', investigator: by, code, actions: 2 }],
    })
    return
  }
  if (code !== '09053') throw Error('Unreviewed next-turn benefit')
  const eligible = (s: Parameters<typeof getInvestigator>[0], by: string) =>
    atLocation(s, by).filter((i) => i.id !== by && !i.turnTaken && s.activeTurn !== i.id)
  registerPlayerCard({
    code,
    noAttacksOfOpportunity: true,
    canPlay: (s, by) => eligible(s, by).length > 0,
    play: (s, by) =>
      ask(
        by,
        eligible(s, by).map((i) => ({
          label: 'choice.investigator',
          params: { name: i.name },
          target: { type: 'investigator', id: i.id },
          then: [
            {
              type: 'NextTurnBenefits',
              investigator: i.id,
              code,
              actions: 1,
              skillBonus: 1,
              round: s.round,
            },
          ],
        })),
      ),
  })
}
