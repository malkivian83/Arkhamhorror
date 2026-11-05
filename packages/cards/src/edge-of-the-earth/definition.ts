import { registerCampaign } from '../campaign-definition'
import { registerExpeditionCompanions } from './companions'
import { ICE_AND_DEATH } from './ice-and-death-cards'
import { iceAndDeathPartOne } from './ice-and-death'
import { edgeOfTheEarthChaosBags } from './opening'
import { registerTekelili } from './tekelili'
import './ice-and-death-encounters'
import './ice-and-death-locations'

registerExpeditionCompanions()
registerTekelili()

registerCampaign({
  id: 'edge-of-the-earth',
  name: 'campaign.names.edge-of-the-earth',
  chaosBags: edgeOfTheEarthChaosBags,
  scenarios: [
    {
      id: ICE_AND_DEATH,
      build: iceAndDeathPartOne,
      allowDeckChangesAfter: false,
      keywords: ['frost', 'hunter', 'massive', 'parley'],
    },
    { id: 'ice-and-death-checkpoint-1' },
  ],
})
