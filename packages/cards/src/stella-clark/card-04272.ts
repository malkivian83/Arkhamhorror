import { getInvestigator, registerPlayerCard, shroudOf, type Message } from '@lcg/engine'
import { WINGING_IT } from './codes'

// RR: Investigate, Discard Pile. Winging It: you may play it from your discard pile; if you do,
// shuffle it into your deck after resolving its effects. Investigate: your location gets -1
// shroud for this investigation (from the discard pile: 1 additional clue if you succeed).
registerPlayerCard({
  code: WINGING_IT,
  investigateAction: true,
  playableFromDiscard: true,
  play: (state, investigator, _x, fromDiscard) => {
    const here = getInvestigator(state, investigator).location
    if (here === null) return []
    const investigate: Message = {
      type: 'BeginSkillTest',
      investigator,
      skill: 'intellect',
      difficulty: Math.max(0, shroudOf(state, here) - 1),
      kind: { type: 'investigate', location: here, ...(fromDiscard ? { extraClues: 1 } : {}) },
    }
    return fromDiscard
      ? [
          investigate,
          { type: 'RemoveFromDiscard', investigator, code: WINGING_IT },
          { type: 'ShuffleCardsIntoDeck', investigator, cards: [WINGING_IT] },
        ]
      : [investigate]
  },
})
