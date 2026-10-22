import { getInvestigator, getLocation } from '@lcg/engine'
import { registerBasicAsset } from './register'
// Otherworldly Compass: -X shroud, X revealed locations connected to yours.
registerBasicAsset('04194', [
  {
    action: 'investigate',
    cost: ['exhaust'],
    shroud: ({ state, investigator }) => {
      const here = getInvestigator(state, investigator).location!
      return -getLocation(state, here).connections.filter((id) => state.locations[id]?.revealed)
        .length
    },
  },
])
