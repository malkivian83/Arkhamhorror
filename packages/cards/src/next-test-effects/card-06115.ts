import { registerPlayerCard } from '@lcg/engine'
// RR: Skill Test Results, Lasting Effects, Modifiers. Wait until the test ends;
// a helper reserves the reduction for their own next test, not the performer's.
registerPlayerCard({
  code: '06115',
  afterCommittedTestEnds: (s, t, success, by) => {
    const amount = Math.min(3, Math.max(0, (t.modifiedSkill ?? 0) - t.difficulty))
    return success && amount > 0
      ? [
          {
            type: 'ReduceNextTestDifficulty',
            investigator: by,
            amount,
            phase: s.phase,
            round: s.round,
          },
        ]
      : []
  },
})
