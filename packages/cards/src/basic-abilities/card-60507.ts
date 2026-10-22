import { getInvestigator, shroudOf, type Message } from '@lcg/engine'
import { registerBasicAsset } from './register'
// Old Keyring (0, 3): -2 shroud; a success removes a key and it is discarded without keys.
// Level 3 discovers 1 more clue if the test's difficulty was 0.
for (const [code, bonusClue] of [
  ['60507', false],
  ['09117', true],
] as const)
  registerBasicAsset(
    code,
    [
      {
        action: 'investigate',
        shroud: -2,
        onSuccess: ({ state, self, investigator }) => {
          const here = getInvestigator(state, investigator).location!
          return [
            { type: 'SpendUses', asset: self.id, amount: 1 },
            ...(bonusClue && shroudOf(state, here) - 2 <= 0
              ? [{ type: 'DiscoverClues', investigator, amount: 1, location: here } as Message]
              : []),
          ]
        },
      },
    ],
    () => ({ discardWhenEmpty: true }),
  )
