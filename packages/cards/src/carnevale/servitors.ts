import { registerEnemy, type EnemyCard } from '@lcg/engine'
import { enemy } from '../scenario-helpers'
import { C } from './setup'

/** Datos impresos. Los desplazamientos especiales se resuelven en el escenario. */
export const SERVITORS: Record<string, EnemyCard> = {
  [C.lagorio]: enemy({
    code: C.lagorio,
    name: 'Don Lagorio',
    traits: ['Humanoid', 'Servitor', 'Elite'],
    fight: 4,
    health: 4,
    evade: 3,
    damage: 2,
    horror: 0,
    keywords: ['hunter'],
    victory: 1,
  }),
  [C.magro]: enemy({
    code: C.magro,
    name: 'Elisabetta Magro',
    traits: ['Humanoid', 'Lodge', 'Elite'],
    fight: 3,
    health: 4,
    evade: 4,
    damage: 1,
    horror: 1,
    keywords: ['aloof'],
    victory: 1,
  }),
  [C.neri]: enemy({
    code: C.neri,
    name: 'Salvatore Neri',
    traits: ['Humanoid', 'Sorcerer', 'Elite'],
    fight: 0,
    health: 3,
    evade: 0,
    damage: 0,
    horror: 2,
    keywords: ['retaliate'],
    victory: 1,
  }),
  [C.corvi]: enemy({
    code: C.corvi,
    name: 'Savio Corvi',
    traits: ['Humanoid', 'Cultist', 'Elite'],
    fight: 3,
    health: 5,
    evade: 3,
    damage: 1,
    horror: 1,
    keywords: ['hunter'],
    victory: 1,
  }),
}

registerEnemy({
  code: C.magro,
  forced: (_s, trigger, self) =>
    trigger.type === 'mythosPhaseEnds'
      ? [{ type: 'PlaceDoomOnEnemy', enemy: self.id, amount: 1, checkAgenda: false }]
      : [],
})
