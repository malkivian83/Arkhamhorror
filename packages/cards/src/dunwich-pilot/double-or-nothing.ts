import { registerPlayerCard } from '@lcg/engine'
// RR ST.7 and official FAQ: determine success effects, then repeat them; reactions happen once.
registerPlayerCard({
  code: '02026',
  onCommit: () => [{ type: 'ModifySkillTest', difficultyFactor: 2, resultRepetitions: 2 }],
})
