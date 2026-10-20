import { registerPlayerCard } from '@lcg/engine'
// RR: Skills; Skill Tests ST.7; Healing. Recovery belongs to the investigator who committed the card.
registerPlayerCard({
  code: '02268',
  afterCommittedTest: (_state, test, succeeded, by) =>
    succeeded
      ? [
          {
            type: 'Heal',
            investigator: by,
            damage: 0,
            horror: (test.modifiedSkill ?? 0) - test.difficulty >= 2 ? 2 : 1,
          },
        ]
      : [],
})
