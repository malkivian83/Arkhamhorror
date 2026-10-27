import { registerEnemy } from '@lcg/engine'
import { enemy } from '../scenario-helpers'
import { T } from './essex-codes'
export const grapplingHorror = enemy({
  code: T.grappling,
  name: 'Grappling Horror',
  traits: ['Monster', 'Abomination'],
  fight: 3,
  health: 3,
  evade: 2,
  damage: 1,
  horror: 1,
  keywords: ['hunter'],
})
registerEnemy({ code: T.grappling })
