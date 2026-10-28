import { registerEnemy } from '@lcg/engine'
import { enemy } from '../scenario-helpers'
import { W } from './doom-codes'
export const servantOfTheLurker = enemy({
  code: W.lurker,
  name: 'Servant of the Lurker',
  traits: ['Monster', 'Abomination'],
  fight: 4,
  health: 5,
  evade: 2,
  damage: 2,
  horror: 2,
  keywords: ['hunter'],
  prey: { type: 'lowestSkill', skill: 'agility' },
})
registerEnemy({
  code: W.lurker,
  forced: (_s, t, e) =>
    t.type === 'whenEnemyAttacks' && t.enemy === e.id
      ? [{ type: 'MillDeck', investigator: t.investigator, amount: 2 }]
      : [],
})
