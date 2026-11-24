// RR: Skill Tests ST.2/ST.8, Forced Abilities, Weaknesses; Amanda FAQ 1.8/2.0 and Rules Form January/September 2024.
import { canCommitFrom, registerInvestigator } from '@lcg/engine'
import { ask, event, registerAdvancedCard as registerPlayerCard } from '../advanced-tests/common'
export function registerAmandaSharpeCard(code: string): void {
  if (code === '07002') {
    registerInvestigator({
      code,
      observesCommitCopies: true,
      forced: (_s, t, i) =>
        t.type === 'investigationPhaseBegins'
          ? [
              { type: 'DrawCards', investigator: i.id, amount: 1 },
              { type: 'DiscardInvestigatorBeneath', investigator: i.id },
              { type: 'ChooseInvestigatorBeneath', investigator: i.id, required: '07009' },
            ]
          : [],
      startCommitWindow: (s, i) => {
        const code = i.beneath?.[0]
        return code && canCommitFrom(s, i.id, code, 'beneath', true, { mandatory: true })
          ? [
              {
                type: 'CommitCard',
                investigator: i.id,
                code,
                fromBeneath: 0,
                mandatory: true,
                byEffect: true,
              },
            ]
          : []
      },
      elderSign: (s, i) => ({
        modifier: 0,
        immediate: s.skillTest?.committed.some(
          (c) => c.by === i.id && c.fromBeneath !== undefined && !c.returnToHand && !c.putIntoPlay,
        )
          ? ask(
              i.id,
              [
                {
                  label: 'choice.doubleBeneathIcons',
                  then: [{ type: 'DoubleBeneathIcons', investigator: i.id }],
                },
                { label: 'choice.skip', then: [] },
              ],
              true,
            )
          : [],
      }),
    })
    return
  }
  if (code === '07008') {
    registerPlayerCard({
      code,
      canPlay: () => false,
      // Its printed fast opportunity is exclusively the initiation reaction window.
      handReactions: (_s, t, by) =>
        t.type === 'afterSkillTestInitiated' && t.investigator === by
          ? event(code, by, [
              { type: 'RemoveFromDiscard', investigator: by, code, playedEvent: true },
              { type: 'SwapEventBeneath', investigator: by, code },
            ])
          : [],
    })
    return
  }
  if (code === '07009') {
    registerPlayerCard({ code, subtractsIcons: true })
    return
  }
  throw Error('Unreviewed Amanda card ' + code)
}
