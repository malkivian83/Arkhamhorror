import { theHouseAlwaysWins, THE_HOUSE_ALWAYS_WINS } from './the-house-always-wins'
import { registerCampaign } from '../campaign-definition'
import './encounter-sets'
import { DUNWICH_CHAOS_BAGS, THE_DUNWICH_LEGACY } from './campaign'
import { extracurricularActivity, EXTRACURRICULAR_ACTIVITY } from './extracurricular-activity'

registerCampaign({
  id: THE_DUNWICH_LEGACY.id,
  name: 'campaign.names.the-dunwich-legacy',
  chaosBags: DUNWICH_CHAOS_BAGS,
  openingScenarios: ['extracurricular-activity', 'the-house-always-wins'],
  prologue: { title: 'story.dunwich.prologueTitle', body: 'story.dunwich.prologue' },
  // Enable each scenario only after implementing its rules and resolutions.
  scenarios: THE_DUNWICH_LEGACY.scenarios.map((id) =>
    id === EXTRACURRICULAR_ACTIVITY
      ? {
          id,
          build: ({ difficulty, log }) => extracurricularActivity({ difficulty, log }),
          keywords: ['peril', 'surge', 'aloof', 'hunter', 'retaliate', 'massive', 'prey'],
        }
      : id === THE_HOUSE_ALWAYS_WINS
        ? {
            id,
            build: ({ difficulty, log }) => theHouseAlwaysWins({ difficulty, log }),
            keywords: ['aloof', 'hunter', 'retaliate', 'surge', 'prey'],
          }
        : { id },
  ),
})
