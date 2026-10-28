import { getInvestigator, registerEnemy } from '@lcg/engine'
import { enemy } from '../scenario-helpers'
import { L } from './lost-codes'
export const yithianStarseeker = enemy({
  code: L.starseeker,
  name: 'Yithian Starseeker',
  traits: ['Monster', 'Yithian'],
  fight: 3,
  health: 4,
  evade: 5,
  damage: 2,
  horror: 1,
  keywords: ['retaliate'],
  spawnAt: L.another,
})
registerEnemy({
  code: L.starseeker,
  forced: (s, t, e) =>
    t.type === 'whenEnemyAttacks' &&
    t.enemy === e.id &&
    getInvestigator(s, t.investigator).discard.length > 10
      ? [{ type: 'PlaceDoomOnEnemy', enemy: e.id, amount: 1 }]
      : [],
})
