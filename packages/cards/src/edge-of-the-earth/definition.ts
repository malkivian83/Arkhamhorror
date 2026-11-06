import { registerCampaign } from '../campaign-definition'
import { registerExpeditionCompanions } from './companions'
import {
  ICE_AND_DEATH,
  ICE_CHECKPOINT_ONE,
  ICE_CHECKPOINT_TWO,
  ICE_PART_THREE,
  EOTE_RESTFUL_NIGHT,
  EOTE_FATAL_MIRAGE,
  EOTE_FORBIDDEN_PEAKS,
  ICE_PART_TWO,
} from './ice-and-death-cards'
import { iceAndDeathPartOne } from './ice-and-death'
import { iceAndDeathPartTwo } from './part-two'
import { iceAndDeathPartThree } from './part-three'
import { edgeOfTheEarthChaosBags } from './opening'
import { registerTekelili } from './tekelili'
import './ice-and-death-encounters'
import './ice-and-death-locations'
import './memorials'

registerExpeditionCompanions()
registerTekelili()

registerCampaign({
  id: 'edge-of-the-earth',
  name: 'campaign.names.edge-of-the-earth',
  release: 8,
  chaosBags: edgeOfTheEarthChaosBags,
  scenarios: [
    {
      id: ICE_AND_DEATH,
      build: iceAndDeathPartOne,
      allowDeckChangesAfter: false,
      keywords: ['frost', 'hunter', 'massive', 'parley'],
    },
    { id: ICE_CHECKPOINT_ONE, checkpoint: true, allowDeckChangesAfter: false },
    {
      id: ICE_PART_TWO,
      build: iceAndDeathPartTwo,
      allowDeckChangesAfter: false,
      keywords: ['frost', 'parley', 'retaliate'],
    },
    { id: ICE_CHECKPOINT_TWO, checkpoint: true, allowDeckChangesAfter: false },
    {
      id: ICE_PART_THREE,
      build: iceAndDeathPartThree,
      allowDeckChangesAfter: false,
      keywords: ['frost', 'hunter'],
    },
    { id: EOTE_RESTFUL_NIGHT, checkpoint: true },
    { id: EOTE_FATAL_MIRAGE },
    { id: EOTE_FORBIDDEN_PEAKS },
  ],
})
