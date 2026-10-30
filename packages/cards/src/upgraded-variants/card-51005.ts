import { playerCardDef, registerPlayerCard, type GameState } from '@lcg/engine'
import { assetName, assetsHere, chooseTarget } from '../dunwich-pilot/helpers'

// RR: Uses; Target; "Either (choose one)". Only assets that use ammo or supplies are eligible;
// placing works from zero, doubling adds the remaining tokens.
const targets = (state: GameState, investigator: string) =>
  assetsHere(state, investigator).filter((asset) =>
    ['ammo', 'supply', 'supplies'].includes(playerCardDef(asset.code)?.uses?.type ?? ''),
  )
registerPlayerCard({
  code: '51005',
  canPlay: (state, investigator) => targets(state, investigator).length > 0,
  play: (state, investigator) =>
    chooseTarget(
      investigator,
      targets(state, investigator).flatMap((asset) => [
        {
          label: 'choice.contrabandPlaceUses',
          params: { card: assetName(asset) },
          target: { type: 'asset' as const, id: asset.id },
          then: [
            { type: 'AddUses' as const, asset: asset.id, amount: 2 },
            { type: 'DrawCards' as const, investigator, amount: 1 },
          ],
        },
        ...(asset.uses > 0
          ? [
              {
                label: 'choice.pilotDoubleUses',
                params: { card: assetName(asset) },
                target: { type: 'asset' as const, id: asset.id },
                then: [{ type: 'AddUses' as const, asset: asset.id, amount: asset.uses }],
              },
            ]
          : []),
      ]),
    ),
})
