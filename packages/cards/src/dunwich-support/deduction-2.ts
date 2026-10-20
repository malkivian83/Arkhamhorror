import { registerPlayerCard } from '@lcg/engine'
// RR: Skills; Skill Tests ST.7. Clues belong to the investigated location and testing investigator.
registerPlayerCard({
  code: '02150',
  afterCommittedTest: (_state, test, succeeded) =>
    succeeded && test.kind.type === 'investigate'
      ? [
          {
            type: 'DiscoverClues',
            investigator: test.investigator,
            location: test.kind.location,
            amount: (test.modifiedSkill ?? 0) - test.difficulty >= 2 ? 2 : 1,
          },
        ]
      : [],
})
