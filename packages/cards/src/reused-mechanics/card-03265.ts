import {
  getInvestigator,
  registerPlayerCard,
  turnAheadThisRound,
  type GameState,
} from '@lcg/engine'
import { atLocation } from '../dunwich-pilot/helpers'
// RR: Additional Actions, Investigation Phase. Guidance: another investigator at your location
// who has yet to take a turn this round gains 1 additional action for that turn.
const eligible = (state: GameState, investigator: string) =>
  atLocation(state, investigator).filter(
    (other) =>
      other.id !== investigator &&
      state.activeTurn !== other.id &&
      turnAheadThisRound(state, other.id),
  )
registerPlayerCard({
  code: '03265',
  canPlay: (state, investigator) =>
    getInvestigator(state, investigator).location !== null &&
    eligible(state, investigator).length > 0,
  play: (state, investigator) => [
    {
      type: 'Ask',
      investigator,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.pilotTarget',
        choices: eligible(state, investigator).map((other) => ({
          label: 'choice.investigator',
          params: { name: other.name },
          target: { type: 'investigator', id: other.id },
          then: [{ type: 'GainTurnActionsThisRound', investigator: other.id, amount: 1 }],
        })),
      },
    },
  ],
})
