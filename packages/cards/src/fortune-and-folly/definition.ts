/** Fortuna e insensatez como escenario independiente en dos partes (guía ES p. 3). */
import { registerCampaign } from '../campaign-definition'
import { CHAOS_BAGS, FORTUNE_AND_FOLLY, PART_ONE, PART_TWO } from './cards'
import './encounter'
import './encounter-two'
import { fortuneAndFollyPartOne } from './part-one'
import { fortuneAndFollyPartTwo } from './part-two'
import './roles'

registerCampaign({
  id: FORTUNE_AND_FOLLY,
  name: 'campaign.names.fortune-and-folly',
  standalone: true,
  chaosBags: CHAOS_BAGS,
  scenarios: [
    {
      id: PART_ONE,
      allowDeckChangesAfter: false,
      build: ({ difficulty, seed }) => fortuneAndFollyPartOne({ difficulty, seed }),
      keywords: [
        'fofAlarm',
        'fofPatrol',
        'fofGameIcons',
        'fofMulligan',
        'fofRoles',
        'fofWellspring',
      ],
    },
    {
      id: PART_TWO,
      build: ({ difficulty, seed, investigators, log }) =>
        fortuneAndFollyPartTwo({ difficulty, seed, players: investigators.length, log }),
      keywords: ['fofAlarm', 'fofPatrol', 'fofGameIcons', 'fofMulligan', 'fofRoles', 'fofHeist'],
    },
  ],
})
