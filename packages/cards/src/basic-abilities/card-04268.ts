import { registerBasicAsset } from './register'
// Colt Vest Pocket: level 0 is always discarded at the end of the round; level 2 only
// if its action ability was triggered this round.
for (const [code, bonus, always] of [
  ['04268', 1, true],
  ['53006', 2, false],
] as const)
  registerBasicAsset(
    code,
    [{ action: 'fight', cost: ['use'], modifier: bonus, extraDamage: 1 }],
    () => ({
      forced: (state, trigger, self) =>
        trigger.type === 'roundEnds' &&
        (always ||
          state.abilityUses.some(
            (u) => u.key.startsWith(`${self.id}:fight:`) && u.round === state.round,
          ))
          ? [{ type: 'DiscardAsset', asset: self.id }]
          : [],
    }),
  )
