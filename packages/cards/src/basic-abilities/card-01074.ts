import { ifTokens, registerBasicAsset } from './register'
// Baseball Bat (0): discarded after an attack revealing a skull or an autofail.
registerBasicAsset(
  ['01074', '01574'],
  [
    {
      action: 'fight',
      modifier: 2,
      extraDamage: 1,
      after: ({ self }) => [
        ifTokens(['skull', 'autoFail'], [{ type: 'DiscardAsset', asset: self.id }]),
      ],
    },
  ],
)
