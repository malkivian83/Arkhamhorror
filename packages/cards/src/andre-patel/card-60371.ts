import { getInvestigator, registerPlayerCard, type Choice } from '@lcg/engine'
import { WATCH_THIS } from './codes'

// RR: Committing Cards, Additional Costs, Skill Test Results. "Watch this!": commit only to a
// test you are performing; as an additional cost, spend up to 3 resources. If you succeed by
// 1 or more, gain twice that many resources (each copy pays out what was spent on it).
registerPlayerCard({
  code: WATCH_THIS,
  canCommit: (_state, test, by) => test.investigator === by,
  onCommit: (state, by) => {
    const max = Math.min(3, getInvestigator(state, by).resources)
    return [
      {
        type: 'Ask',
        investigator: by,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.watchThis',
          choices: Array.from({ length: max + 1 }, (_, n): Choice => ({
            label: 'choice.spendResources',
            params: { n },
            then: n
              ? [
                  { type: 'SpendResources', investigator: by, amount: n },
                  { type: 'CommitPayment', code: WATCH_THIS, amount: n },
                ]
              : [],
          })),
        },
      },
    ]
  },
  afterCommittedTest: (_state, test, succeeded, by) =>
    succeeded && (test.modifiedSkill ?? 0) - test.difficulty >= 1
      ? [{ type: 'PlayerCardEffect', code: WATCH_THIS, investigator: by, step: 'payout' }]
      : [],
  // Both copies resolve this; the first takes everything paid, so nothing is counted twice.
  effect: (state, investigator, step) => {
    const paid = state.skillTest?.commitPayments?.[WATCH_THIS] ?? 0
    return step === 'payout' && paid > 0
      ? [
          { type: 'GainResources', investigator, amount: 2 * paid },
          { type: 'CommitPayment', code: WATCH_THIS, amount: -paid },
        ]
      : []
  },
})
