import { registerPlayerCard } from '@lcg/engine'

// RR: Automatic Success, Instead, Elite. Replace the normal outcome, retain success triggers.
registerPlayerCard({
  code: '09105',
  playInAnyFastWindow: true,
  canPlay: (s, by) => {
    const t = s.skillTest
    return (
      !!t &&
      t.investigator === by &&
      ['fight', 'evade'].includes(t.kind.type) &&
      t.tokens.length === 0 &&
      !t.revealing &&
      !t.noTokens &&
      t.succeeded === null &&
      t.difficulty === 0
    )
  },
  play: (s, by) => {
    const t = s.skillTest
    if (!t || (t.kind.type !== 'fight' && t.kind.type !== 'evade')) return []
    const e = s.enemies[t.kind.enemy]
    if (!e) return []
    return [
      { type: 'AutoSucceedSkillTest' },
      {
        type: 'ReplaceSkillTestResults',
        then: e.traits?.includes('Elite')
          ? [
              { type: 'EvadeEnemy', enemy: e.id, by },
              { type: 'DamageEnemy', enemy: e.id, amount: 3, by },
            ]
          : [{ type: 'DiscardEnemy', enemy: e.id }],
      },
    ]
  },
})
