import { playerCardDef, registerPlayerCard, type GameState } from '@lcg/engine'
import { assetName, assetsHere, chooseTarget } from './helpers'

// RR: Uses; Target. Adds the remaining tokens, not the printed starting quantity.
const targets = (state: GameState, investigator: string) =>
  assetsHere(state, investigator).filter(
    (asset) =>
      asset.uses > 0 && ['ammo', 'supplies'].includes(playerCardDef(asset.code)?.uses?.type ?? ''),
  )
registerPlayerCard({
  code: '02109',
  canPlay: (state, investigator) => targets(state, investigator).length > 0,
  play: (state, investigator) =>
    chooseTarget(
      investigator,
      targets(state, investigator).map((asset) => ({
        label: 'choice.pilotDoubleUses',
        params: { card: assetName(asset) },
        target: { type: 'asset', id: asset.id },
        then: [{ type: 'AddUses', asset: asset.id, amount: asset.uses }],
      })),
    ),
})
