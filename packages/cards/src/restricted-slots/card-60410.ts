import { registerPlayerCard } from '@lcg/engine'

// RR: Equipment Slots. The extra arcane slot holds one Spell asset.
registerPlayerCard({
  code: '60410',
  restrictedSlots: [{ slot: 'arcane', count: 1, trait: 'Spell' }],
})
