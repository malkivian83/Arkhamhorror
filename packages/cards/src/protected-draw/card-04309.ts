import { registerPlayerCard } from '@lcg/engine'

// RR: Skill Test Results; All In official FAQ, June 2024. Its owner must perform
// and succeed at the test. Each resolution is capped, including doubled results.
registerPlayerCard({
  code: '04309',
  afterCommittedTest: (_s, t, success, by) => {
    const amount = Math.min(5, Math.max(0, (t.modifiedSkill ?? 0) - t.difficulty))
    return success && by === t.investigator && amount > 0
      ? [{ type: 'DrawCards', investigator: by, amount, shuffleWeaknesses: true }]
      : []
  },
})
