import { getInvestigator, registerPlayerCard } from '@lcg/engine'
import { mayChoose } from '../core-2026/player-cards'

// RR: Skill Test Results, As If; Quick Thinking FAQ. Create the delayed action
// during results (so Double or Nothing repeats it), then wait for ST.8.
registerPlayerCard({
  code: '02229',
  afterCommittedTest: (s, t, success, by) =>
    success && (t.modifiedSkill ?? 0) - t.difficulty >= 2 && !getInvestigator(s, by).eliminated
      ? [
          mayChoose(by, 'choice.quickThinkingAction', {}, [
            {
              type: 'AfterCurrentSkillTest',
              then: [{ type: 'TakeImmediateAction', investigator: by }],
            },
          ]),
        ]
      : [],
})
