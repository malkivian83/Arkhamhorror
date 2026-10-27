import { playerCardDef, registerTreachery, stuckInPlay } from '@lcg/engine'
import { damage } from '../scenario-helpers'
import { THE_BEYOND_CODES } from './beyond-codes'

registerTreachery({
  code: THE_BEYOND_CODES.pushedIntoTheBeyond,
  revelation: (state, investigator) => {
    const choices = Object.values(state.assets)
      .filter((a) => {
        const card = playerCardDef(a.code)
        return (
          a.owner === investigator &&
          !stuckInPlay(state, a) &&
          !card?.story &&
          !card?.traits.includes('Story')
        )
      })
      .map((a) => ({
        label: 'choice.card',
        params: { card: playerCardDef(a.code)?.name ?? a.code },
        target: { type: 'asset' as const, id: a.id },
        then: [
          { type: 'ShuffleAssetIntoDeck' as const, asset: a.id },
          {
            type: 'MillDeck' as const,
            investigator,
            amount: 3,
            ifDiscarded: { code: a.code, then: [damage(investigator, 0, 2)] },
          },
        ],
      }))
    return choices.length
      ? [
          {
            type: 'Ask',
            investigator,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.dunwich.pushedAsset',
              choices,
            },
          },
        ]
      : [{ type: 'MillDeck', investigator, amount: 3 }]
  },
})
