import { registerCampaign } from '../campaign-definition'
import { CALL_OF_THE_PLAGUEBEARER, PLAGUEBEARER_CHAOS_BAGS } from './campaign'
import { LATE_RISERS, lateRisers } from './scenario'
registerCampaign({
  id: CALL_OF_THE_PLAGUEBEARER.id,
  name: 'campaign.names.call-of-the-plaguebearer',
  prologue: { title: 'story.plaguebearer.prologueTitle', body: 'story.plaguebearer.prologue' },
  chaosBags: PLAGUEBEARER_CHAOS_BAGS,
  scenarios: CALL_OF_THE_PLAGUEBEARER.scenarios.map((id) =>
    id === LATE_RISERS
      ? {
          id,
          build: ({ difficulty }) => lateRisers({ difficulty }),
          keywords: ['hunter', 'aloof', 'retaliate', 'alert', 'massive', 'prey'],
        }
      : { id },
  ),
})
