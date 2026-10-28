import { registerEnemy } from '@lcg/engine'
import { enemy } from '../scenario-helpers'
import { W } from './doom-codes'
export const devoteeOfTheKey = enemy({
  code: W.devotee,
  name: 'Devotee of the Key',
  traits: ['Humanoid', 'Sorcerer'],
  fight: 3,
  health: 3,
  evade: 3,
  damage: 1,
  horror: 1,
  keywords: [],
})
registerEnemy({
  code: W.devotee,
  spawn: () => [W.base],
  forced: (_s, t, e) =>
    t.type !== 'enemyPhaseEnds'
      ? []
      : e.location === W.peak
        ? [
            { type: 'DiscardEnemy', enemy: e.id },
            { type: 'PlaceDoom', amount: 2 },
          ]
        : [{ type: 'HuntOnce', enemy: e.id, toward: W.peak, attack: false }],
})
