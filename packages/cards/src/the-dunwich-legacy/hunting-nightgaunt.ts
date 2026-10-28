import { registerEnemy } from '@lcg/engine'
import { enemy } from '../scenario-helpers'
import { B } from './altar-codes'
export const huntingNightgaunt = enemy({
  code: B.nightgaunt,
  name: 'Hunting Nightgaunt',
  traits: ['Monster', 'Nightgaunt'],
  fight: 3,
  health: 4,
  evade: 1,
  damage: 1,
  horror: 1,
  keywords: ['hunter'],
})
registerEnemy({
  code: B.nightgaunt,
  tokenModifier: (_s, _e, t, m) => (t.kind.type === 'evade' && m < 0 ? m * 2 : m),
})
