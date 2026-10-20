import { registerPlayerCard } from '@lcg/engine'
import { fightOptions } from './effects'
// RR: Fight. Zero failed-attack damage does not cancel Retaliate.
registerPlayerCard({
  code: '02016',
  abilities: (state, self, investigator) =>
    fightOptions(state, self, investigator, 1, { failDamagePerPoint: 0 }),
})
