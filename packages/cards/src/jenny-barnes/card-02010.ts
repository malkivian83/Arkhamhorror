import { registerPlayerCard } from '@lcg/engine'
import { fightOptions } from '../dunwich-pilot/effects'

// RR: Costs (X), Uses, Fight. X resources are paid on play and become X ammo.
registerPlayerCard({
  code: '02010',
  costX: true,
  abilities: (s, a, i) =>
    a.uses < 1
      ? []
      : fightOptions(s, a, i, 2, { extraDamage: 1 }).map((option) => ({
          ...option,
          costs: [{ type: 'SpendUses' as const, asset: a.id, amount: 1 }],
        })),
})
