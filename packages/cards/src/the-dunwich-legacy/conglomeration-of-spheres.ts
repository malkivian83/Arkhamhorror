import { playerCardDef, registerEnemy } from '@lcg/engine'
import { enemy } from '../scenario-helpers'
import { W } from './doom-codes'
export const conglomerationOfSpheres = enemy({
  code: W.spheres,
  name: 'Conglomeration of Spheres',
  traits: ['Monster', 'Abomination'],
  fight: 1,
  health: 6,
  evade: 4,
  damage: 1,
  horror: 1,
  keywords: ['hunter'],
  prey: { type: 'lowestSkill', skill: 'willpower' },
})
registerEnemy({
  code: W.spheres,
  forced: (s, t, e) => {
    if (t.type !== 'skillTestEnded' || t.kind !== 'fight' || t.enemy !== e.id) return []
    const asset = t.source ? s.assets[t.source] : undefined
    return asset && playerCardDef(asset.code)?.traits.includes('Melee')
      ? [{ type: 'DiscardAsset', asset: asset.id }]
      : []
  },
})
