/** Asesinato en el hotel Excelsior como escenario independiente. */
import { registerCampaign } from '../campaign-definition'
import './assets'
import { EXCELSIOR } from './cards'
import './encounter'
import { CHAOS_BAGS, murderAtTheExcelsiorHotel } from './excelsior'
import './locations'
import './plot'

registerCampaign({
  id: EXCELSIOR,
  name: 'campaign.names.murder-at-the-excelsior-hotel',
  standalone: true,
  chaosBags: CHAOS_BAGS,
  scenarios: [
    {
      id: EXCELSIOR,
      build: ({ difficulty, seed, investigators }) =>
        murderAtTheExcelsiorHotel({ difficulty, seed, players: investigators.length }),
      keywords: [
        'excelsiorPatrol',
        'aloof',
        'hunter',
        'retaliate',
        'massive',
        'prey',
        'surge',
        'peril',
        'parley',
        'leads',
        'trueCulprit',
      ],
    },
  ],
})
