import {
  getInvestigator,
  playerCardDef,
  type Asset,
  type Choice,
  type GameState,
  type InvestigatorId,
  type Message,
} from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'
import { assetsHere } from '../dunwich-pilot/helpers'

const usesType = (a: Asset) => playerCardDef(a.code)?.uses?.type ?? ''
const hasTrait = (a: Asset, trait: string) => !!playerCardDef(a.code)?.traits.includes(trait)

/** Firearm assets controlled by investigators at your location (Extra Ammunition). */
export const firearmsHere = (state: GameState, by: InvestigatorId) =>
  assetsHere(state, by).filter((a) => hasTrait(a, 'Firearm'))

/** Your assets that use the given kind of token (charge/charges, secret/secrets). */
export const ownWithUses = (state: GameState, by: InvestigatorId, kind: 'charge' | 'secret') =>
  Object.values(state.assets).filter(
    (a) => a.owner === by && [kind, kind + 's'].includes(usesType(a)),
  )

/** Place tokens on one of the given assets. */
export const placeOn = (by: InvestigatorId, assets: Asset[], amount: (a: Asset) => number) =>
  ask(
    by,
    assets.map((a): Choice => ({
      label: 'choice.assignToAsset',
      params: { card: playerCardDef(a.code)!.name },
      target: { type: 'asset', id: a.id },
      then: [{ type: 'AddUses', asset: a.id, amount: amount(a) }],
    })),
  )

/** "If it is your turn, end your turn." */
export const endIfYourTurn = (state: GameState, by: InvestigatorId): Message[] =>
  state.activeTurn === by ? [{ type: 'EndTurn', investigator: by }] : []

export const here = (state: GameState, by: InvestigatorId) => getInvestigator(state, by).location
