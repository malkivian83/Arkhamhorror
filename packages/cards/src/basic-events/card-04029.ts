import { type Message } from '@lcg/engine'
import { ifTokens, registerBasicAsset, SYMBOLS } from '../basic-abilities/register'
// Mists of R'lyeh (0, 2, 4): willpower evasion; on success you may move to a connecting
// location; a symbol makes you choose and discard a card from your hand.
for (const [code, bonus] of [
  ['04029', 0],
  ['53007', 1],
  ['04271', 3],
] as const)
  registerBasicAsset(code, [
    {
      action: 'evade',
      skills: ['willpower'],
      cost: ['use'],
      modifier: bonus,
      onSuccess: ({ investigator }) => [{ type: 'ChooseMove', investigator }],
      after: ({ investigator }) => [
        ifTokens(SYMBOLS, [{ type: 'ChooseDiscardFromHand', investigator, amount: 1 } as Message]),
      ],
    },
  ])
