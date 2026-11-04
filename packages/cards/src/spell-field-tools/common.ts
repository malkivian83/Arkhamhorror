import {
  getInvestigator,
  canEnter,
  moveBlocked,
  playerCardDef,
  type Asset,
  type GameState,
  type Message,
  type ReactionOption,
} from '@lcg/engine'
import { destinations as adjacent } from '../dunwich-pilot/effects'
export { ask, continuation, cardName } from '../dunwich-pilot/effects'
export const destinations = (s: GameState, by: string) =>
  moveBlocked(s, by) ? [] : adjacent(s, by).filter((l) => canEnter(s, by, l))
export const local = (s: GameState, by: string) =>
  s.investigators.filter(
    (i) => !i.eliminated && i.location !== null && i.location === getInvestigator(s, by).location,
  )
export const exhaust = (a: Asset): Message => ({ type: 'ExhaustAsset', asset: a.id })
export const react = (
  a: Asset,
  then: Message[],
  limit?: ReactionOption['limit'],
): ReactionOption => ({
  key: a.id + ':field',
  investigator: a.owner,
  label: 'choice.fieldAbility',
  params: { card: playerCardDef(a.code)!.name },
  then,
  ...(limit ? { limit } : {}),
})
export const heal = (by: string, damage = 0, horror = 0): Message => ({
  type: 'Heal',
  investigator: by,
  damage,
  horror,
})
export const draw = (by: string, amount = 1): Message => ({
  type: 'DrawCards',
  investigator: by,
  amount,
})
export const gain = (by: string, amount = 1): Message => ({
  type: 'GainResources',
  investigator: by,
  amount,
})
export const hurt = (by: string, damage = 0, horror = 0): Message => ({
  type: 'TakeDamage',
  investigator: by,
  damage,
  horror,
})
