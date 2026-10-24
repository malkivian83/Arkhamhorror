import { registerCampaign } from '../campaign-definition'
import { A_PHANTOM_OF_TRUTH, aPhantomOfTruth } from './a-phantom-of-truth'
import { CARCOSA_CHAOS_BAGS, THE_PATH_TO_CARCOSA } from './campaign'
import { CURTAIN_CALL, curtainCall } from './curtain-call'
import { CLASP_OF_BLACK_ONYX } from './echoes-assets'
import { ECHOES_OF_THE_PAST, echoesOfThePast } from './echoes-of-the-past'
import { THE_LAST_KING, theLastKing } from './the-last-king'
import { THE_MAN_IN_THE_PALLID_MASK } from './the-man-in-the-pallid-mask'
import { THE_UNSPEAKABLE_OATH, theUnspeakableOath } from './the-unspeakable-oath'

registerCampaign({
  id: THE_PATH_TO_CARCOSA.id,
  name: 'campaign.names.the-path-to-carcosa',
  chaosBags: CARCOSA_CHAOS_BAGS,
  // Guía ES pp. 5–6: si el afectado abandona la campaña, otro investigador pasa a serlo.
  // Guía ES p. 15 (Resolución 1): igual con el Broche de ónice negro.
  transferOnLeave: [THE_MAN_IN_THE_PALLID_MASK, CLASP_OF_BLACK_ONYX],
  prologue: { title: 'story.carcosa.prologueTitle', body: 'story.carcosa.prologue' },
  // Cada escenario se habilita al completar sus reglas, resolución y pruebas (doc. 84).
  scenarios: THE_PATH_TO_CARCOSA.scenarios.map((id) =>
    id === CURTAIN_CALL
      ? {
          id,
          build: ({ difficulty, seed }) => curtainCall({ difficulty, seed }),
          keywords: ['hidden', 'peril', 'surge', 'aloof', 'massive', 'hunter', 'retaliate', 'prey'],
        }
      : id === THE_LAST_KING
        ? {
            id,
            build: ({ difficulty, seed, investigators }) =>
              theLastKing({ difficulty, seed, players: investigators.length }),
            keywords: ['bystanders', 'peril', 'surge', 'aloof', 'hunter', 'retaliate', 'prey'],
          }
        : id === ECHOES_OF_THE_PAST
          ? {
              id,
              build: ({ difficulty, seed, investigators, log }) =>
                echoesOfThePast({ difficulty, seed, players: investigators.length, log }),
              keywords: ['hidden', 'peril', 'surge', 'aloof', 'hunter', 'retaliate', 'prey'],
            }
          : id === THE_UNSPEAKABLE_OATH
            ? {
                id,
                build: ({ difficulty, seed, log }) => theUnspeakableOath({ difficulty, seed, log }),
                keywords: ['hidden', 'peril', 'surge', 'massive', 'hunter', 'retaliate', 'prey'],
              }
            : id === A_PHANTOM_OF_TRUTH
              ? {
                  id,
                  build: ({ difficulty, seed, log }) => aPhantomOfTruth({ difficulty, seed, log }),
                  keywords: ['peril', 'surge', 'aloof', 'hunter', 'retaliate', 'prey'],
                }
              : { id },
  ),
})
