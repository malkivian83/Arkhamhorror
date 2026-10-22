import { registerPlayerCard } from '@lcg/engine'

// RR: Equipment Slots, Fast. The extra arcane slot holds one Spell or Ritual asset.
registerPlayerCard({
  code: '05112',
  restrictedSlots: [{ slot: 'arcane', count: 1, trait: ['Spell', 'Ritual'] }],
})
