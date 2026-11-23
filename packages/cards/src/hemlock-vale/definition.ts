import { registerCampaign, type CampaignScenario } from '../campaign-definition'
import { hemlockValeChaosBags } from './chaos-bag'
import { FIRST_EVENING, firstEvening, TWISTED_HOLLOW } from './first-evening'
import { twistedHollow } from './twisted-hollow'
import { HEMLOCK_HOUSE, hemlockHouse } from './hemlock-house'
import { LOST_SISTER, lostSister } from './lost-sister'
import { SILENT_HEATH, silentHeath } from './silent-heath'
import { THING_IN_THE_DEPTHS, thingInTheDepthsScenario } from './thing-in-the-depths'
import { DAY_ONE_SCENARIOS, HEMLOCK_WELCOME, welcomeToHemlockVale } from './welcome'
import { NEXT_PRELUDE, WRITTEN_IN_ROCK, writtenInRock } from './written-in-rock'

/**
 * Pasos de la campaña. El orden lo deciden los preludios (`valley.route`); los
 * escenarios sin `build` todavía no se pueden jugar (docs-proyecto/165).
 */
const BUILDS: Record<string, CampaignScenario['build']> = {
  [WRITTEN_IN_ROCK]: writtenInRock,
  [HEMLOCK_HOUSE]: (context) => hemlockHouse(context),
  [SILENT_HEATH]: (context) => silentHeath(context),
  [LOST_SISTER]: (context) => lostSister(context),
  [THING_IN_THE_DEPTHS]: (context) => thingInTheDepthsScenario(context),
}

const PRELUDES: Record<string, CampaignScenario['build']> = {
  [FIRST_EVENING]: firstEvening,
}

const steps: CampaignScenario[] = [
  {
    id: HEMLOCK_WELCOME,
    build: welcomeToHemlockVale,
    // La experiencia de los preludios no se gasta hasta que lo indique la guía (p. 3).
    allowDeckChangesAfter: false,
    allowSideStoryBefore: false,
    keywords: ['codex', 'dayNight', 'prelude'],
  },
  ...DAY_ONE_SCENARIOS.map((id): CampaignScenario => {
    const build = BUILDS[id]
    return build
      ? { id, build, allowSideStoryBefore: false, keywords: ['codex', 'dayNight', 'grid'] }
      : { id, allowSideStoryBefore: false }
  }),
  // Preludios de las tardes y albas (entregas 6–8). La experiencia de La primera tarde no se
  // gasta hasta el final del escenario siguiente (p. 33).
  ...[...new Set(Object.values(NEXT_PRELUDE))].map((id): CampaignScenario => {
    const build = PRELUDES[id]
    return build
      ? {
          id,
          build,
          allowDeckChangesAfter: false,
          allowSideStoryBefore: false,
          keywords: ['codex', 'prelude'],
        }
      : { id, allowSideStoryBefore: false }
  }),
  // Escenarios de la noche (entregas 6–7).
  {
    id: TWISTED_HOLLOW,
    build: twistedHollow,
    allowSideStoryBefore: false,
    keywords: ['codex', 'dayNight', 'grid'],
  },
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
