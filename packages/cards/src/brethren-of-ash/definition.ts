/** Brethren of Ash (caja básica de 2026) como definición de campaña. */
import { registerCampaign } from '../campaign-definition'
import { BRETHREN_OF_ASH, CHAOS_BAGS } from './campaign'
import { queenOfAsh } from './queen-of-ash'
import { smokeAndMirrors } from './smoke-and-mirrors'
import { DR_ARMITAGE, spreadingFlames } from './spreading-flames'

registerCampaign({
  id: BRETHREN_OF_ASH.id,
  name: 'campaign.names.brethren-of-ash',
  chaosBags: CHAOS_BAGS,
  prologue: { title: 'story.brethrenOfAsh.prologueTitle', body: 'story.brethrenOfAsh.prologue' },
  scenarios: [
    { id: 'spreading-flames', build: ({ difficulty }) => spreadingFlames(difficulty) },
    {
      id: 'smoke-and-mirrors',
      build: ({ difficulty, log, seed, investigators }) =>
        smokeAndMirrors({ difficulty, log, seed, players: investigators.length }),
      // El portador de Armitage lo pone en juego en la preparación.
      storyAssetsInPlay: [DR_ARMITAGE],
    },
    {
      id: 'queen-of-ash',
      build: ({ difficulty, log, seed, investigators }) =>
        queenOfAsh({ difficulty, log, seed, investigators }),
    },
  ],
})
