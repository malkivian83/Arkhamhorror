import { registerEnemy } from '@lcg/engine'
import { enemy } from '../scenario-helpers'
import { REMAINING_CODES as C } from './remaining-codes'
export const thrall = enemy({
  code: C.thrall,
  name: 'Thrall',
  traits: ['Humanoid', 'Monster', 'Abomination'],
  fight: 2,
  health: 2,
  evade: 2,
  damage: 1,
  horror: 1,
  keywords: ['retaliate'],
})
registerEnemy({
  code: C.thrall,
  spawn: (state) => {
    const locations = Object.values(state.locations)
    const most = Math.max(...locations.map((l) => l.clues))
    return locations.filter((l) => l.clues === most).map((l) => l.id)
  },
})
