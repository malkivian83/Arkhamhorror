import { registerPlayerCard, turnActionTiming } from '@lcg/engine'
// FAQ 2.4 (July 2025): only an actual investigator turn; the timing is shared with
// Quick Learner (engine `turnActionTiming`).
export const planTiming = turnActionTiming
registerPlayerCard({
  code: '07024',
  additionalIcons: (s) => {
    const timing = planTiming(s)
    return timing === 'early'
      ? { willpower: 1, agility: 1 }
      : timing === 'late'
        ? { combat: 1, intellect: 1 }
        : {}
  },
  afterCommittedTest: (s, _t, success, by) =>
    success && planTiming(s) === 'middle'
      ? [{ type: 'DrawCards', investigator: by, amount: 1 }]
      : [],
})
