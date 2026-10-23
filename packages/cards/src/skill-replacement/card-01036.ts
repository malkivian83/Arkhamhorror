import { registerPlayerCard } from '@lcg/engine'

// RR: Skill Test Timing ST.1; Lasting Effects. Choosing intellect is optional.
registerPlayerCard({
  code: '01036',
  canPlay: (s, by) => s.activeTurn === by && !s.skillTest,
  play: (_s, by) =>
    (['combat', 'agility'] as const).map((from) => ({
      type: 'RoundSkillReplacement',
      investigator: by,
      from,
      to: 'intellect',
      code: '01036',
    })),
})
