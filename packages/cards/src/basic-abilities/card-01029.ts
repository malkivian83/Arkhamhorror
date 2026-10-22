import { registerBasicAsset } from './register'
// Shotgun (4) and Sawed-Off Shotgun (5): damage by margin instead of the standard damage,
// also when a failed attack would damage another investigator.
for (const [codes, bonus, max] of [
  [['01029', '01529'], 3, 5],
  [['06327'], 0, 6],
] as const)
  registerBasicAsset(
    [...codes],
    [
      {
        action: 'fight',
        cost: ['use'],
        modifier: bonus,
        fight: { damagePerSuccess: { max }, failDamagePerPoint: max },
      },
    ],
  )
