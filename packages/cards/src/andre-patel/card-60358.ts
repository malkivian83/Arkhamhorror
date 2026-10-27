import { enemiesAt, getInvestigator, registerPlayerCard } from '@lcg/engine'
import { FAME } from './codes'

// RR: Uses, Parley, Action. Fame: [action] if there is an enemy at your location, spend 1
// renown: Parley. Gain 2 resources. Discarded when it has no renown.
registerPlayerCard({
  code: FAME,
  discardWhenEmpty: true,
  abilities: (state, self, investigator) => {
    const here = getInvestigator(state, investigator).location
    if (self.uses < 1 || here === null || enemiesAt(state, here).length === 0) return []
    return [
      {
        key: `${self.id}:parley`,
        label: 'ability.fame',
        actions: 1,
        provokes: false,
        parley: true,
        costs: [{ type: 'SpendUses', asset: self.id, amount: 1 }],
        then: [{ type: 'GainResources', investigator, amount: 2 }],
      },
    ]
  },
})
