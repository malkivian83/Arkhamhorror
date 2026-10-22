import { GOOD_TOKENS, horror, ifTokens, registerBasicAsset } from './register'
// Clairvoyance (0, 3, 5): willpower investigation with extra clues; an elder sign, +1
// or 0 costs horror.
for (const [code, bonus, extra] of [
  ['60408', 0, 1],
  ['60426', 2, 1],
  ['60431', 3, 2],
] as const)
  registerBasicAsset(code, [
    {
      action: 'investigate',
      skills: ['willpower'],
      cost: ['use'],
      modifier: bonus,
      extraClues: extra,
      after: ({ investigator }) => [ifTokens(GOOD_TOKENS, [horror(investigator, extra)])],
    },
  ])
