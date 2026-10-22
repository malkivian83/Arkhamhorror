import { GOOD_TOKENS, ifTokens, registerBasicAsset } from './register'
// Ineffable Truth (0, 3, 5): willpower evasion that damages the evaded enemy; an elder
// sign, +1 or 0 costs resources.
for (const [code, bonus, extra] of [
  ['60409', 0, 1],
  ['60427', 2, 1],
  ['60432', 3, 2],
] as const)
  registerBasicAsset(code, [
    {
      action: 'evade',
      skills: ['willpower'],
      cost: ['use'],
      modifier: bonus,
      onSuccess: ({ investigator }, enemy) => [
        {
          type: 'DamageEnemy',
          enemy: enemy!.id,
          amount: extra,
          by: investigator,
          source: { attack: false, traits: ['Spell'] },
        },
      ],
      after: ({ investigator }) => [
        ifTokens(GOOD_TOKENS, [{ type: 'LoseResources', investigator, amount: extra }]),
      ],
    },
  ])
