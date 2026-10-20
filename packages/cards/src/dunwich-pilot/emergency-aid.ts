import { playerCardDef, registerPlayerCard, type Choice } from '@lcg/engine'
import { assetName, assetsHere, atLocation, chooseTarget } from './helpers'

// RR: Healing; Target. Ally traits, rather than occupied slots, determine eligible assets.
const targets = (state: Parameters<typeof atLocation>[0], investigator: string): Choice[] => [
  ...atLocation(state, investigator)
    .filter((other) => other.damage > 0)
    .map((other): Choice => ({
      label: 'choice.pilotHealDamage',
      params: { name: other.name, n: 2 },
      target: { type: 'investigator', id: other.id },
      then: [{ type: 'Heal', investigator: other.id, damage: 2, horror: 0 }],
    })),
  ...assetsHere(state, investigator)
    .filter((asset) => asset.damage > 0 && playerCardDef(asset.code)?.traits.includes('Ally'))
    .map((asset): Choice => ({
      label: 'choice.pilotHealDamage',
      params: { name: assetName(asset), n: 2 },
      target: { type: 'asset', id: asset.id },
      then: [{ type: 'HealAsset', asset: asset.id, damage: 2, horror: 0 }],
    })),
]
registerPlayerCard({
  code: '02105',
  canPlay: (state, investigator) => targets(state, investigator).length > 0,
  play: (state, investigator) => chooseTarget(investigator, targets(state, investigator)),
})
