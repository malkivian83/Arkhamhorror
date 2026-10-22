import { horror, ifTokens, registerBasicAsset, SYMBOLS } from './register'
// Shrivelling (0, 3, 5): willpower attack; any symbol except the elder sign costs horror.
for (const [codes, bonus, extra] of [
  [['01060', '01560'], 0, 1],
  [['02154'], 2, 1],
  [['02306'], 3, 2],
] as const)
  registerBasicAsset(
    [...codes],
    [
      {
        action: 'fight',
        skills: ['willpower'],
        cost: ['use'],
        modifier: bonus,
        extraDamage: extra,
        after: ({ investigator }) => [ifTokens(SYMBOLS, [horror(investigator, extra)])],
      },
    ],
  )
