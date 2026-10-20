import { registerPlayerCard } from '@lcg/engine'
import { assetName, atLocation } from './helpers'

// RR: Activate Action; Uses; Healing. The charge and action are costs, before opportunity attacks.
registerPlayerCard({
  code: '02030',
  abilities: (state, self) =>
    self.uses <= 0
      ? []
      : atLocation(state, self.owner)
          .filter((other) => other.horror > 0)
          .map((other) => ({
            key: `${self.id}:heal:${other.id}`,
            label: 'ability.pilotHealHorror',
            params: { card: assetName(self), name: other.name },
            target: { type: 'investigator', id: other.id },
            actions: 1,
            provokes: true,
            costs: [{ type: 'SpendUses', asset: self.id, amount: 1 }],
            then: [{ type: 'Heal', investigator: other.id, damage: 0, horror: 1 }],
          })),
})
