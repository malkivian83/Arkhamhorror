import { getInvestigator, registerPlayerCard } from '@lcg/engine'

// RR: Commit Cards, Skill Test Results. Use the committer's completed attacks,
// including attacks outside their turn, but never those of the performer.
registerPlayerCard({
  code: '11025',
  additionalIcons: (s, _t, by) => {
    const history = getInvestigator(s, by).successfulAttacks
    const n = history?.round === s.round ? history.count : 0
    return { combat: n, wild: n }
  },
})
