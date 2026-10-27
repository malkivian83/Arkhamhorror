import { getInvestigator, registerTreachery } from '@lcg/engine'
import { effectTest } from '../scenario-helpers'
import { THE_BEYOND_CODES } from './beyond-codes'

registerTreachery({
  code: THE_BEYOND_CODES.arcaneBarrier,
  revelation: (state, investigator, self) => {
    const location = getInvestigator(state, investigator).location
    return location
      ? [{ type: 'PlaceTreachery', treachery: self.id, placement: { type: 'location', location } }]
      : []
  },
  beforeMove: (state, self, move) => {
    if (self.placement.type !== 'location') return null
    const from = getInvestigator(state, move.investigator).location
    if (
      from === null ||
      from === move.location ||
      (self.placement.location !== from && self.placement.location !== move.location)
    )
      return null
    return [
      effectTest(move.investigator, 'Arcane Barrier', 'willpower', 4, {
        onSuccess: [{ type: 'DiscardTreachery', treachery: self.id }, move],
        onFail: [
          {
            type: 'Ask',
            investigator: move.investigator,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.dunwich.barrier',
              choices: [
                { label: 'choice.dunwich.cancelMove', then: [] },
                {
                  label: 'choice.dunwich.discardAndMove',
                  then: [{ type: 'MillDeck', investigator: move.investigator, amount: 5 }, move],
                },
              ],
            },
          },
        ],
      }),
    ]
  },
})
