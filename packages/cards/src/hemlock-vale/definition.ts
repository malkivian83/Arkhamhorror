import { registerCampaign, type CampaignScenario } from '../campaign-definition'
import { hemlockValeChaosBags } from './chaos-bag'
import { DAY_ONE_SCENARIOS, HEMLOCK_WELCOME, welcomeToHemlockVale } from './welcome'

/**
 * Pasos de la campaña. El orden lo deciden los preludios (`valley.route`); los
 * escenarios sin `build` todavía no se pueden jugar (docs-proyecto/165).
 */
const steps: CampaignScenario[] = [
  {
    id: HEMLOCK_WELCOME,
    build: welcomeToHemlockVale,
    // La experiencia de los preludios no se gasta hasta que lo indique la guía (p. 3).
    allowDeckChangesAfter: false,
    allowSideStoryBefore: false,
    keywords: ['codex', 'dayNight', 'prelude'],
  },
  ...DAY_ONE_SCENARIOS.map((id): CampaignScenario => ({ id, allowSideStoryBefore: false })),
]

const byId = new Map(steps.map((step) => [step.id, step]))

registerCampaign({
  id: 'the-feast-of-hemlock-vale',
  name: 'campaign.names.the-feast-of-hemlock-vale',
  release: 10,
  chaosBags: hemlockValeChaosBags,
  scenarios: steps,
  route: (log) => [
    steps[0]!,
    ...(log.valley?.route ?? []).flatMap((id) => {
      const step = byId.get(id)
      return step ? [step] : []
    }),
  ],
})
