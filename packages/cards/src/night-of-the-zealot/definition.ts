import { theMidnightMasks } from './the-midnight-masks'
import { theDevourerBelow } from './the-devourer-below'
import { registerCampaign } from '../campaign-definition'
import { NIGHT_OF_THE_ZEALOT, ZEALOT_CHAOS_BAGS } from './campaign'
import { THE_GATHERING, theGathering } from './the-gathering'

registerCampaign({
  id: NIGHT_OF_THE_ZEALOT.id,
  name: 'campaign.names.night-of-the-zealot',
  chaosBags: ZEALOT_CHAOS_BAGS,
  prologue: { title: 'story.zealot.prologueTitle', body: 'story.zealot.prologue' },
  scenarios: [
    {
      id: THE_GATHERING,
      build: ({ difficulty }) => theGathering(difficulty),
      keywords: ['hunter', 'prey', 'retaliate', 'surge', 'peril'],
    },
    {
      id: 'the-midnight-masks',
      build: theMidnightMasks,
      keywords: ['hunter', 'prey', 'peril', 'surge'],
    },
    {
      id: 'the-devourer-below',
      build: theDevourerBelow,
      keywords: ['hunter', 'massive', 'retaliate', 'peril', 'surge'],
    },
  ],
})
