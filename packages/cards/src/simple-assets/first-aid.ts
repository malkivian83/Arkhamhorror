import { playerCardDef, registerPlayerCard, type AbilityOption } from '@lcg/engine'
import { assetsHere, atLocation } from '../dunwich-pilot/helpers'
// First Aid (3): spend 1 supply: heal 1 damage and 1 horror from an investigator or Ally
// asset at your location; discarded when it has no supplies.
export function registerFirstAid(code: string): void {
  const card = () => playerCardDef(code)!.name
  registerPlayerCard({
    code,
    discardWhenEmpty: true,
    abilities: (s, self) => {
      if (self.uses < 1) return []
      const base = {
        label: 'ability.simpleFirstAid',
        actions: 1,
        provokes: true,
        costs: [{ type: 'SpendUses' as const, asset: self.id, amount: 1 }],
      }
      return [
        ...atLocation(s, self.owner)
          .filter((i) => i.damage + i.horror > 0)
          .map((i): AbilityOption => ({
            ...base,
            key: `${self.id}:heal:${i.id}`,
            params: { card: card(), name: i.name },
            target: { type: 'investigator', id: i.id },
            then: [{ type: 'Heal', investigator: i.id, damage: 1, horror: 1 }],
          })),
        ...assetsHere(s, self.owner)
          .filter((a) => a.damage + a.horror > 0 && playerCardDef(a.code)?.traits.includes('Ally'))
          .map((a): AbilityOption => ({
            ...base,
            key: `${self.id}:heal:${a.id}`,
            params: { card: card(), name: playerCardDef(a.code)!.name },
            target: { type: 'asset', id: a.id },
            then: [{ type: 'HealAsset', asset: a.id, damage: 1, horror: 1 }],
          })),
      ]
    },
  })
}
