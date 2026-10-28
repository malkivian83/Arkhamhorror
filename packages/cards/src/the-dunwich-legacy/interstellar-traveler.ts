import { registerEnemy } from '@lcg/engine'
import { enemy } from '../scenario-helpers'
import { L } from './lost-codes'
import { extradimensional } from './lost-helpers'
export const interstellarTraveler = enemy({
  code: L.traveler,
  name: 'Interstellar Traveler',
  traits: ['Monster', 'Yithian'],
  fight: 4,
  health: 3,
  evade: 2,
  damage: 1,
  horror: 2,
  keywords: ['hunter'],
})
registerEnemy({
  code: L.traveler,
  spawn: (s) => extradimensional(s).map((l) => l.id),
  forced: (s, t, e) => {
    if (t.type !== 'enemyWouldEnterLocation' || t.enemy !== e.id) return []
    return [
      ...((s.locations[t.location]?.clues ?? 0) > 0
        ? [
            {
              type: 'MoveClues' as const,
              from: { type: 'location' as const, id: t.location },
              to: { type: 'pool' as const },
              amount: 1,
            },
          ]
        : []),
      { type: 'PlaceDoomOnEnemy', enemy: e.id, amount: 1 },
    ]
  },
})
