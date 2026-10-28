import { getInvestigator, registerPlayerCard } from '@lcg/engine'
import { DARK_HORSE } from './codes'

// RR: Limit, Upkeep Phase, Constant Abilities. Dark Horse: limit 1 per investigator. During the
// upkeep phase you may choose not to gain resources. While you have no resources in your
// resource pool, you get +1 to each skill (also when a cost spends your last resource, FAQ).
registerPlayerCard({
  code: DARK_HORSE,
  limitTitle: true,
  mayDeclineUpkeepResources: true,
  skillModifier: (state, self) => (getInvestigator(state, self.owner).resources === 0 ? 1 : 0),
})
