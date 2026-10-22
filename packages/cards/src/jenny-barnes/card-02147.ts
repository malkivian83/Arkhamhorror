import { registerPlayerCard } from '@lcg/engine'

// RR: Equipment Slots. The extra hand slot holds only Weapon assets; a two-handed
// weapon may use it together with a regular hand slot.
registerPlayerCard({
  code: '02147',
  restrictedSlots: [{ slot: 'hand', count: 1, trait: 'Weapon' }],
})
