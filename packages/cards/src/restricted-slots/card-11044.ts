import { playerCardDef, registerPlayerCard } from '@lcg/engine'

// RR: Equipment Slots, Limit X per investigator. Two extra hand slots hold
// Science and/or Tool assets.
registerPlayerCard({
  code: '11044',
  limitTitle: true,
  canPlay: (s, by) =>
    !Object.values(s.assets).some(
      (a) => a.owner === by && playerCardDef(a.code)?.name === 'Scientific Studies Grant',
    ),
  restrictedSlots: [{ slot: 'hand', count: 2, trait: ['Science', 'Tool'] }],
})
