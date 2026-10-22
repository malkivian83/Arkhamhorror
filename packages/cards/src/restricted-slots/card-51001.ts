import { assetSlots, playerCardDef, registerPlayerCard } from '@lcg/engine'

// RR: Equipment Slots. Two extra hand slots hold only Weapon assets; the bonus
// counts every hand slot used by the controller's Weapon assets, restricted or not.
registerPlayerCard({
  code: '51001',
  restrictedSlots: [{ slot: 'hand', count: 2, trait: 'Weapon' }],
  skillModifier: (s, self, test) =>
    test.skill === 'willpower' &&
    Object.values(s.assets)
      .filter(
        (a) =>
          a.owner === self.owner && !a.noSlot && playerCardDef(a.code)?.traits.includes('Weapon'),
      )
      .flatMap(assetSlots)
      .filter((slot) => slot === 'hand').length >= 2
      ? 1
      : 0,
})
