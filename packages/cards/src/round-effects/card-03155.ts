import { registerPlayerCard } from '@lcg/engine'

// RR: Fast; Lasting Effects. X tracks current horror, rather than a snapshot.
registerPlayerCard({
  code: '03155',
  canPlay: (s, by) => s.activeTurn === by,
  play: (_s, by) =>
    (['combat', 'agility'] as const).map((skill) => ({
      type: 'RoundSkillBonus',
      investigator: by,
      skill,
      amount: 'horror',
      code: '03155',
    })),
})
