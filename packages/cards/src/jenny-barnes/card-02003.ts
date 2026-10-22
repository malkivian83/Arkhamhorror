import { registerInvestigator } from '@lcg/engine'

// RR: Upkeep Phase step 4.4 (collect resources), Elder Sign. The modifier counts
// the resources Jenny has when the token is revealed.
registerInvestigator({
  code: '02003',
  upkeepResources: 1,
  elderSign: (_s, i) => ({ modifier: i.resources }),
})
