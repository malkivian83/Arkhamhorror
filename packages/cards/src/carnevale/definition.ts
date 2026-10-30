import { registerCampaign } from '../campaign-definition'
import { carnevaleOfHorrors } from './scenario'
import { CARNEVALE, CHAOS_BAGS } from './setup'

registerCampaign({
  id: CARNEVALE,
  name: `campaign.names.${CARNEVALE}`,
  standalone: true,
  chaosBags: CHAOS_BAGS,
  scenarios: [
    {
      id: CARNEVALE,
      storyAssetsInPlay: ['82022'],
      build: ({ difficulty, seed }) => carnevaleOfHorrors({ difficulty, seed }),
      keywords: ['hunter', 'retaliate', 'prey', 'surge', 'peril', 'parley'],
    },
  ],
})
