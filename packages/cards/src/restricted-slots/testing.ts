import { dispatch, playerCardBehavior, type GameState, type SkillTest } from '@lcg/engine'
import { game, patch, withAsset } from '../dunwich-pilot/testing'
import './index'

export { game, withAsset }
const ready = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
/** Puts a card from hand into play, as an asset search or card effect would. */
export const put = (s: GameState, code: string) =>
  dispatch(ready(patch({ hand: [code] })(s)), {
    type: 'PutAssetIntoPlay',
    investigator: 'a',
    code,
    fromHand: true,
  })
export const owned = (s: GameState) =>
  Object.values(s.assets)
    .filter((a) => a.owner === 'a')
    .map((a) => a.code)
    .sort()
export const discard = (s: GameState, asset: string) =>
  dispatch(ready(s), { type: 'DiscardAsset', asset })
/** Starts from several assets already in play, each with its own id. */
export const holding = (...codes: string[]) =>
  codes.reduce((s, code, n) => withAsset(s, code, { id: `${code}-${n}` }), game())
export const modifier = (s: GameState, asset: string, skill: SkillTest['skill']) =>
  playerCardBehavior(s.assets[asset]!.code)!.skillModifier!(s, s.assets[asset]!, {
    skill,
  } as SkillTest)
