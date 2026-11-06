import { registerPlayerCard } from '@lcg/engine'
import { companionHealing } from './companion-healing'

const healDamage = companionHealing('damage', true, 1)
const healHorror = companionHealing('horror', true, 1)

registerPlayerCard({
  code: '08736',
  abilities: (state, self, investigator) => [
    ...healDamage(state, self, investigator),
    ...healHorror(state, self, investigator),
  ],
})
