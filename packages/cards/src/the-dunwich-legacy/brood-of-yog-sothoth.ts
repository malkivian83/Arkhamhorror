import { registerEnemy } from '@lcg/engine'
import { enemy } from '../scenario-helpers'
import { U } from './unseen-codes'
export const broodOfYogSothoth = enemy({
  code: U.brood,
  name: 'Brood of Yog-Sothoth',
  traits: ['Monster', 'Abomination'],
  fight: 6,
  health: 1,
  evade: 3,
  damage: 2,
  horror: 2,
  keywords: ['massive'],
  victory: 1,
})
registerEnemy({
  code: U.brood,
  healthModifier: (s) => s.startingInvestigatorCount,
  canBeAttacked: (_s, _e, _i, source) => source === U.formula,
  damageTaken: (s, _e, amount, source) => ({
    amount: source.attack && s.skillTest?.effectSource === U.formula ? amount : 0,
  }),
})
