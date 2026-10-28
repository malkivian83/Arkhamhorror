import { registerEnemy } from '@lcg/engine'
import { enemy } from '../scenario-helpers'
import { W } from './doom-codes'
export const sethBishop = enemy({
  code: W.seth,
  name: 'Seth Bishop',
  traits: ['Humanoid', 'Sorcerer', 'Elite'],
  fight: 5,
  health: 3,
  healthPerInvestigator: true,
  evade: 5,
  damage: 1,
  horror: 1,
  keywords: ['retaliate'],
  victory: 1,
})
registerEnemy({ code: W.seth })
