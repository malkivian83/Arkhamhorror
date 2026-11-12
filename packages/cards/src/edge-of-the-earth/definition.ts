import { registerCampaign } from '../campaign-definition'
import { fatalMirage } from './fatal-mirage'
import { registerExpeditionCompanions } from './companions'
import {
  ICE_AND_DEATH,
  ICE_CHECKPOINT_ONE,
  ICE_CHECKPOINT_TWO,
  ICE_PART_THREE,
  EOTE_RESTFUL_NIGHT,
  EOTE_FATAL_MIRAGE,
  EOTE_FORBIDDEN_PEAKS,
  EOTE_ENDLESS_NIGHT,
  EOTE_CITY,
  ICE_PART_TWO,
} from './ice-and-death-cards'
import { iceAndDeathPartOne } from './ice-and-death'
import { iceAndDeathPartTwo } from './part-two'
import { iceAndDeathPartThree } from './part-three'
import { edgeOfTheEarthChaosBags, edgeOfTheEarthStartingBag } from './opening'
import { registerTekelili } from './tekelili'
import './ice-and-death-encounters'
import './ice-and-death-locations'
import './memorials'
import './forbidden-peaks'
import './city'

registerExpeditionCompanions()
registerTekelili()

registerCampaign({
  id: 'edge-of-the-earth',
  name: 'campaign.names.edge-of-the-earth',
  release: 8,
  chaosBags: edgeOfTheEarthChaosBags,
  sideStoryChaosBag: edgeOfTheEarthStartingBag,
  scenarios: [
    {
      id: ICE_AND_DEATH,
      build: iceAndDeathPartOne,
      keywords: ['frost', 'hunter', 'massive', 'parley'],
    },
    { id: ICE_CHECKPOINT_ONE, checkpoint: true },
    {
      id: ICE_PART_TWO,
      build: iceAndDeathPartTwo,
      allowSideStoryBefore: false,
      keywords: ['frost', 'parley', 'retaliate'],
    },
    { id: ICE_CHECKPOINT_TWO, checkpoint: true },
    {
      id: ICE_PART_THREE,
      build: iceAndDeathPartThree,
      allowSideStoryBefore: false,
      keywords: ['frost', 'hunter'],
    },
    { id: EOTE_RESTFUL_NIGHT, checkpoint: true },
    { id: EOTE_FATAL_MIRAGE, build: fatalMirage, keywords: ['frost', 'aloof', 'parley'] },
    { id: EOTE_FORBIDDEN_PEAKS },
    { id: EOTE_ENDLESS_NIGHT, checkpoint: true },
    // Endless Night may send the expedition into the mirage once more before the city.
    { id: EOTE_FATAL_MIRAGE, build: fatalMirage, keywords: ['frost', 'aloof', 'parley'] },
    { id: EOTE_CITY },
  ],
})
