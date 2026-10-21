import { registerPlayerCard } from '@lcg/engine'
import approvals from './approvals.json'

export function registerTestModifier(code: string): void {
  const entry = approvals.cards.find((c) => c.code === code)
  if (!entry) throw new Error('Unreviewed test modifier: ' + code)
  const family = entry.family
  registerPlayerCard({
    code,
    commitWithoutIcons: family === 'gumption',
    committedDifficulty: family === 'gumption' ? -2 : 0,
    canCommit: (_s, t) =>
      !['adapt', 'daring'].includes(family) || t.kind.type === 'fight' || t.kind.type === 'evade',
    committedAttackDamage: (_s, t) =>
      family === 'blow' ? ((t.modifiedSkill ?? 0) - t.difficulty >= 2 ? 2 : 1) : 0,
    additionalIcons: (_s, t, by) =>
      family === 'leadership' && by !== t.investigator ? { willpower: 1, wild: 1 } : {},
    onCommit: (_s, by) =>
      family === 'adapt'
        ? [{ type: 'ModifySkillTest', ignoredEnemyKeywords: ['alert', 'retaliate'] }]
        : family === 'daring'
          ? [
              {
                type: 'ModifySkillTest',
                addedEnemyKeywords: ['alert', 'retaliate'],
                after: [{ type: 'DrawCards', investigator: by, amount: 1 }],
              },
            ]
          : [],
    afterCommittedTest: (_s, t, success, by) =>
      family === 'leadership' && success
        ? [
            { type: 'GainResources', investigator: by, amount: 2 },
            ...(by !== t.investigator
              ? [{ type: 'GainResources' as const, investigator: t.investigator, amount: 2 }]
              : []),
          ]
        : [],
  })
}
