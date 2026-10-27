import { registerCampaign } from '../campaign-definition'
import './encounter-sets'
import { DUNWICH_CHAOS_BAGS, THE_DUNWICH_LEGACY } from './campaign'

registerCampaign({
  id: THE_DUNWICH_LEGACY.id,
  name: 'campaign.names.the-dunwich-legacy',
  chaosBags: DUNWICH_CHAOS_BAGS,
  openingScenarios: ['extracurricular-activity', 'the-house-always-wins'],
  prologue: { title: 'story.dunwich.prologueTitle', body: 'story.dunwich.prologue' },
  // Enable each scenario only after implementing its rules and resolutions.
  scenarios: THE_DUNWICH_LEGACY.scenarios.map((id) => ({ id })),
})
