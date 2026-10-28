import { distancesFrom, getInvestigator, registerEnemy } from '@lcg/engine'
import { enemy } from '../scenario-helpers'
import { W } from './doom-codes'
import { atAltered } from './doom-helpers'
export const crazedShoggoth = enemy({
  code: W.shoggoth,
  name: 'Crazed Shoggoth',
  traits: ['Monster', 'Shoggoth'],
  fight: 3,
  health: 6,
  evade: 4,
  damage: 2,
  horror: 2,
  keywords: [],
  victory: 1,
})
registerEnemy({
  code: W.shoggoth,
  attackKills: true,
  spawn: (s, i) => {
    const from = getInvestigator(s, i).location
    if (!from) return []
    const distances = distancesFrom(s, from),
      candidates = Object.keys(s.locations).filter(
        (l) => atAltered(s, l) && distances.get(l) !== undefined,
      )
    const closest = Math.min(...candidates.map((l) => distances.get(l)!))
    return candidates.filter((l) => distances.get(l) === closest)
  },
})
