import { getInvestigator, type GameState, type Message, type ReactionOption } from '@lcg/engine'
import { cardName } from '../dunwich-pilot/effects'
export const near = (s: GameState, by: string) => {
  const here = getInvestigator(s, by).location
  return here === null ? [] : s.investigators.filter((i) => !i.eliminated && i.location === here)
}
export const reaction = (
  key: string,
  by: string,
  code: string,
  then: Message[],
): ReactionOption => ({
  key,
  investigator: by,
  label: 'choice.protectionUse',
  params: { card: cardName(code) },
  then,
})
export const play = (code: string, by: string, effect: Message[]): Message => ({
  type: 'PlayCard',
  code,
  investigator: by,
  effect,
})
export const exhaust = (asset: string): Message => ({ type: 'ExhaustAsset', asset })
