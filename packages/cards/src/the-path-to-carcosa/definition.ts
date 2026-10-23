import { registerCampaign } from '../campaign-definition'
import { CARCOSA_CHAOS_BAGS, THE_PATH_TO_CARCOSA } from './campaign'
import './curtain-call'

registerCampaign({
  id: THE_PATH_TO_CARCOSA.id,
  name: 'campaign.names.the-path-to-carcosa',
  chaosBags: CARCOSA_CHAOS_BAGS,
  prologue: { title: 'story.carcosa.prologueTitle', body: 'story.carcosa.prologue' },
  // Cada escenario se habilitará al completar sus reglas, resolución y pruebas.
  scenarios: THE_PATH_TO_CARCOSA.scenarios.map((id) => ({ id })),
})
