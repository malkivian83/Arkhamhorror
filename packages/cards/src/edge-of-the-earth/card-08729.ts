import { playerCardDef, stuckInPlay, type Choice, type TreacheryBehavior } from '@lcg/engine'

export const asset: TreacheryBehavior['revelation'] = (state, investigator) => {
  const choices = Object.values(state.assets)
    .filter((asset) => asset.owner === investigator && !stuckInPlay(state, asset))
    .map((asset): Choice => ({
      label: 'choice.discard',
      params: { card: playerCardDef(asset.code)?.name ?? asset.code },
      target: { type: 'asset', id: asset.id },
      then: [{ type: 'DiscardAsset', asset: asset.id }],
    }))
  return choices.length
    ? [
        {
          type: 'Ask',
          investigator,
          question: { kind: 'chooseOne', prompt: 'choice.bsr.discardAsset', choices },
        },
      ]
    : []
}
