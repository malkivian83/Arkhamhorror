import { registerPlayerCard } from '@lcg/engine'
import { atLocation } from './helpers'
import { ask, destinations, moveChoices } from './effects'
// RR: Fast; Move. Effect movement pays entry costs, not move-action costs or opportunity attacks.
registerPlayerCard({
  code: '02022',
  canPlay: (state, investigator) =>
    state.activeTurn === investigator &&
    atLocation(state, investigator).some((i) => destinations(state, i.id).length),
  play: (state, investigator) =>
    ask(
      investigator,
      atLocation(state, investigator).flatMap((i) => moveChoices(state, i.id)),
    ),
})
