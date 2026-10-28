import { registerEnemy } from '@lcg/engine'
import { enemy } from '../scenario-helpers'
import { B } from './altar-codes'
export const silasBishop = enemy({
  code: B.silas,
  name: 'Silas Bishop',
  traits: ['Monster', 'Abomination', 'Elite'],
  fight: 3,
  health: 6,
  healthPerInvestigator: true,
  evade: 7,
  damage: 2,
  horror: 2,
  keywords: ['massive'],
  victory: 2,
  noOpportunityAttacks: true,
})
registerEnemy({ code: B.silas })
