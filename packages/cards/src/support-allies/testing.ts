import { dispatch, playerCardDef, type GameState } from '@lcg/engine'
import { patch } from '../dunwich-pilot/testing'
import './index'

export { enemy, fight, resolve, setup, sturdy } from '../basic-abilities/testing'
export { me, withAsset } from '../dunwich-pilot/testing'

export const labels = (s: GameState) => s.pending?.question.choices.map((c) => c.label) ?? []
/** Puts a card from hand into play for investigator "a". */
export const put = (s: GameState, code: string) =>
  dispatch(
    { ...patch({ hand: [code] })(s), pending: null, queue: [] },
    {
      type: 'PutAssetIntoPlay',
      investigator: 'a',
      code,
      fromHand: true,
    },
  )
export const name = (code: string) => playerCardDef(code)!.name
