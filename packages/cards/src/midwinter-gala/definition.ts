/** La gala del ecuador del invierno como escenario independiente. */
import { registerCampaign } from '../campaign-definition'
import { MIDWINTER_GALA } from './cards'
import './encounter'
import { CHAOS_BAGS, midwinterGala } from './gala'
import './guests'
import './stories'

registerCampaign({
  id: MIDWINTER_GALA,
  name: 'campaign.names.the-midwinter-gala',
  standalone: true,
  chaosBags: CHAOS_BAGS,
  scenarios: [
    {
      id: MIDWINTER_GALA,
      build: ({ difficulty, seed, investigators }) =>
        midwinterGala({ difficulty, seed, players: investigators.length }),
      keywords: ['alert', 'patrol', 'guests', 'spellbound', 'score'],
    },
  ],
})
