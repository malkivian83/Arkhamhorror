import { registerCampaign } from '../campaign-definition'
import { CARCOSA_CHAOS_BAGS, THE_PATH_TO_CARCOSA } from './campaign'
import { CURTAIN_CALL, curtainCall } from './curtain-call'
import { THE_MAN_IN_THE_PALLID_MASK } from './the-man-in-the-pallid-mask'

registerCampaign({
  id: THE_PATH_TO_CARCOSA.id,
  name: 'campaign.names.the-path-to-carcosa',
  chaosBags: CARCOSA_CHAOS_BAGS,
  // Guía ES pp. 5–6: si el afectado abandona la campaña, otro investigador pasa a serlo.
  transferOnLeave: [THE_MAN_IN_THE_PALLID_MASK],
  prologue: { title: 'story.carcosa.prologueTitle', body: 'story.carcosa.prologue' },
  // Cada escenario se habilita al completar sus reglas, resolución y pruebas (doc. 84).
  scenarios: THE_PATH_TO_CARCOSA.scenarios.map((id) =>
    id === CURTAIN_CALL
      ? {
          id,
          build: ({ difficulty, seed }) => curtainCall({ difficulty, seed }),
          keywords: ['hidden', 'peril', 'surge', 'aloof', 'massive', 'hunter', 'retaliate', 'prey'],
        }
      : { id },
  ),
})
