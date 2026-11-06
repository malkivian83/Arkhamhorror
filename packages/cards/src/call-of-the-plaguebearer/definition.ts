import { registerCampaign } from '../campaign-definition'
import { CALL_OF_THE_PLAGUEBEARER, PLAGUEBEARER_CHAOS_BAGS } from './campaign'
import { LATE_RISERS, lateRisers } from './scenario'
import { NIGHT_ON_THE_TOWN, nightOnTheTown } from './night-on-the-town'
import { DEAD_BY_DAWN, deadByDawn } from './dead-by-dawn'
import { MOURNING_CHORUS, mourningChorus } from './mourning-chorus'
registerCampaign({
  id: CALL_OF_THE_PLAGUEBEARER.id,
  name: 'campaign.names.call-of-the-plaguebearer',
  fanmade: true,
  prologue: { title: 'story.plaguebearer.prologueTitle', body: 'story.plaguebearer.prologue' },
  chaosBags: PLAGUEBEARER_CHAOS_BAGS,
  scenarios: CALL_OF_THE_PLAGUEBEARER.scenarios.map((id) =>
    id === LATE_RISERS
      ? {
          id,
          build: ({ difficulty }) => lateRisers({ difficulty }),
          keywords: ['hunter', 'aloof', 'retaliate', 'alert', 'massive', 'prey'],
        }
      : id === NIGHT_ON_THE_TOWN
        ? {
            id,
            build: ({ difficulty, seed }) => nightOnTheTown({ difficulty, seed }),
            keywords: ['hunter', 'retaliate', 'massive', 'defend'],
          }
        : id === DEAD_BY_DAWN
          ? {
              id,
              build: ({ difficulty, log }) => deadByDawn({ difficulty, log }),
              keywords: ['hunter', 'alert', 'retaliate', 'aloof', 'massive', 'peril', 'prey'],
            }
          : id === MOURNING_CHORUS
            ? {
                id,
                build: ({ difficulty, log, seed, investigators }) =>
                  mourningChorus({ difficulty, log, seed, investigators: investigators.length }),
                keywords: ['hunter', 'alert', 'retaliate', 'aloof', 'massive', 'peril', 'surge'],
              }
            : { id },
  ),
})
