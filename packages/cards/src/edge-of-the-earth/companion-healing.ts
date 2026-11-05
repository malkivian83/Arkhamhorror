import {
  getInvestigator,
  playerCardDef,
  type AbilitiesFn,
  type Asset,
  type Choice,
} from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'

export function companionHealing(kind: 'damage' | 'horror', fast: boolean): AbilitiesFn<Asset> {
  return (state, self, investigator) => {
    const here = getInvestigator(state, investigator).location
    if (self.exhausted || self.uses < 1 || here === null) return []
    const nearby = state.investigators.filter((i) => !i.eliminated && i.location === here)
    const amount = { damage: kind === 'damage' ? 2 : 0, horror: kind === 'horror' ? 2 : 0 }
    const label =
      kind === 'damage' ? 'choice.edgeOfTheEarth.healDamage' : 'choice.edgeOfTheEarth.healHorror'
    const choices: Choice[] = [
      ...nearby
        .filter((i) => i[kind] > 0)
        .map((i): Choice => ({
          label,
          params: { name: i.name },
          target: { type: 'investigator', id: i.id },
          then: [{ type: 'Heal', investigator: i.id, ...amount }],
        })),
      ...Object.values(state.assets).flatMap((asset): Choice[] => {
        const def = playerCardDef(asset.code)
        if (
          asset.id === self.id ||
          !asset[kind] ||
          !def?.traits.includes('Ally') ||
          !nearby.some((i) => i.id === asset.owner)
        )
          return []
        return [
          {
            label,
            params: { name: def.name },
            target: { type: 'asset', id: asset.id },
            then: [{ type: 'HealAsset', asset: asset.id, ...amount }],
          },
        ]
      }),
    ]
    return choices.length
      ? [
          {
            key: `${self.id}:heal`,
            label: `ability.edgeOfTheEarth.${kind}`,
            params: { card: playerCardDef(self.code)?.name ?? self.code },
            actions: fast ? 0 : 1,
            provokes: !fast,
            costs: [
              { type: 'SpendUses', asset: self.id, amount: 1 },
              { type: 'ExhaustAsset', asset: self.id },
            ],
            then: ask(investigator, choices),
          },
        ]
      : []
  }
}
