import { damage, GOOD_TOKENS, ifTokens, registerBasicAsset } from './register'
// Azure Flame (0, 3, 5): willpower attack; an elder sign, +1 or 0 costs damage.
for (const [code, bonus, extra] of [
  ['60407', 0, 1],
  ['60425', 2, 1],
  ['60430', 3, 2],
] as const)
  registerBasicAsset(code, [
    {
      action: 'fight',
      skills: ['willpower'],
      cost: ['use'],
      modifier: bonus,
      extraDamage: extra,
      after: ({ investigator }) => [ifTokens(GOOD_TOKENS, [damage(investigator, extra)])],
    },
  ])
