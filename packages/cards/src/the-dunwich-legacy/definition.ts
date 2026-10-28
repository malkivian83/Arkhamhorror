import { lostInTimeAndSpace, LOST_IN_TIME_AND_SPACE } from './lost-in-time-and-space'
import { whereDoomAwaits, WHERE_DOOM_AWAITS } from './where-doom-awaits'
import { theEssexCountyExpress, THE_ESSEX_COUNTY_EXPRESS } from './the-essex-county-express'
import { bloodOnTheAltar, BLOOD_ON_THE_ALTAR } from './blood-on-the-altar'
import { undimensionedAndUnseen, UNDIMENSIONED_AND_UNSEEN } from './undimensioned-and-unseen'
import { theMiskatonicMuseum, THE_MISKATONIC_MUSEUM } from './the-miskatonic-museum'
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
        : id === THE_MISKATONIC_MUSEUM
          ? {
              id,
              build: ({ difficulty, log }) => theMiskatonicMuseum({ difficulty, log }),
              keywords: ['hunter', 'retaliate', 'massive', 'surge', 'peril'],
            }
          : id === THE_ESSEX_COUNTY_EXPRESS
            ? {
                id,
                build: ({ difficulty, log }) => theEssexCountyExpress({ difficulty, log }),
                keywords: ['hunter', 'surge', 'doom', 'peril'],
              }
            : id === BLOOD_ON_THE_ALTAR
              ? {
                  id,
                  build: ({ difficulty, log }) => bloodOnTheAltar({ difficulty, log }),
                  keywords: ['hunter', 'aloof', 'retaliate', 'massive', 'surge', 'peril'],
                }
              : id === UNDIMENSIONED_AND_UNSEEN
                ? {
                    id,
                    build: ({ difficulty, log }) => undimensionedAndUnseen({ difficulty, log }),
                    keywords: ['massive', 'surge', 'peril', 'hunter', 'aloof', 'retaliate'],
                  }
                : id === WHERE_DOOM_AWAITS
                  ? {
                      id,
                      build: ({ difficulty, log }) => whereDoomAwaits({ difficulty, log }),
                      keywords: ['hunter', 'retaliate', 'peril', 'surge', 'prey'],
                    }
                  : id === LOST_IN_TIME_AND_SPACE
                    ? {
                        id,
                        build: ({ difficulty, log }) => lostInTimeAndSpace({ difficulty, log }),
                        keywords: ['hunter', 'retaliate', 'massive', 'peril', 'surge'],
                      }
                    : { id },
  ),
})
