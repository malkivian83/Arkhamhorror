import { getInvestigator, registerEnemy } from '@lcg/engine'
import { enemy } from '../scenario-helpers'
import { T } from './essex-codes'
import { trainNeighbor } from './essex-helpers'
export const emergentMonstrosity = enemy({
  code: T.emergent,
  name: 'Emergent Monstrosity',
  traits: ['Monster', 'Abomination'],
  fight: 4,
  health: 5,
  evade: 3,
  damage: 2,
  horror: 2,
  keywords: [],
  victory: 1,
})
registerEnemy({
  code: T.emergent,
  entersExhausted: true,
  spawn: (s, investigator) => {
    const location = getInvestigator(s, investigator).location
    return location ? [trainNeighbor(s, location, 1) ?? location] : []
  },
})
