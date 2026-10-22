import { registerPlayerCard } from '@lcg/engine'

// RR: Equipment Slots, Hand Size. The extra hand slot holds one Tome asset.
registerPlayerCard({
  code: '60205',
  handSize: 1,
  restrictedSlots: [{ slot: 'hand', count: 1, trait: 'Tome' }],
})
