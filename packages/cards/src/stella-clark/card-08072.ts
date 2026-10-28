import { getInvestigator, playerCardDef, registerPlayerCard } from '@lcg/engine'
import { SCHOFFNERS_CATALOGUE } from './codes'

// RR: Uses (secrets), Costs. Schoffner's Catalogue: discarded without secrets. You may spend its
// secrets as resources to pay for [[Item]] assets played by any investigator at your location.
registerPlayerCard({
  code: SCHOFFNERS_CATALOGUE,
  discardWhenEmpty: true,
  usesAsResources: (state, self, payer, code) => {
    const card = playerCardDef(code)
    const here = getInvestigator(state, self.owner).location
    return (
      card?.type === 'asset' &&
      card.traits.includes('Item') &&
      here !== null &&
      getInvestigator(state, payer).location === here
    )
  },
})
