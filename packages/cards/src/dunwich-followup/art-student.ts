import { getInvestigator, registerPlayerCard } from '@lcg/engine'
import { reaction } from '../core-2026/cards'
// RR: Reactions; Entering Play. The clue is optional and comes from the controller's location.
registerPlayerCard({
  code: '02149',
  reactions: (state, trigger, self) => {
    const here = getInvestigator(state, self.owner).location
    return trigger.type === 'afterAssetEntersPlay' &&
      trigger.asset === self.id &&
      here !== null &&
      (state.locations[here]?.clues ?? 0) > 0
      ? [
          reaction(self, 'ability.followupClue', [
            { type: 'DiscoverClues', investigator: self.owner, amount: 1 },
          ]),
        ]
      : []
  },
})
