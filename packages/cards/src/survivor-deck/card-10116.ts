import { getInvestigator, registerPlayerCard } from '@lcg/engine'
// RR Commit, Skill Tests ST.7: damage is a separate instance, not attack damage.
registerPlayerCard({
  code: '10116',
  commitWithoutIcons: true,
  canCommit: (s, t, by) => {
    if (t.kind.type !== 'fight' && t.kind.type !== 'evade') return false
    const here = getInvestigator(s, by).location
    const enemy = s.enemies[t.kind.enemy]
    return (
      here !== null &&
      !!enemy &&
      (enemy.location === here || s.locations[here]?.connections.includes(enemy.location) === true)
    )
  },
  commitFromLocation: (s, t, by) => {
    const here = getInvestigator(s, by).location
    return (
      here !== null &&
      (t.kind.type === 'fight' || t.kind.type === 'evade') &&
      !!s.enemies[t.kind.enemy] &&
      s.locations[here]?.connections.includes(s.enemies[t.kind.enemy]!.location) === true
    )
  },
  afterCommittedTest: (_s, t, success, by) =>
    success && (t.kind.type === 'fight' || t.kind.type === 'evade')
      ? [
          {
            type: 'DamageEnemy',
            enemy: t.kind.enemy,
            amount: 1,
            by,
            source: { traits: ['Practiced'] },
          },
        ]
      : [],
})
