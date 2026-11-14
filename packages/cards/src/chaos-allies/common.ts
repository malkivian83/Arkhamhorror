// RR: Triggered abilities, Chaos Bag, Bonded, Effects.
import {
  getInvestigator,
  type AbilityOption,
  type Asset,
  type GameState,
  type Message,
} from '@lcg/engine'
export { ask, cardName, continuation } from '../dunwich-pilot/effects'
export {
  registerAdvancedCard as registerPlayerCard,
  option,
  event,
  exhaust,
  spend,
} from '../advanced-tests/common'
import { cardName, continuation } from '../dunwich-pilot/effects'

export type Data = Record<string, string | number | boolean>
export const here = (s: GameState, by: string) => getInvestigator(s, by).location
export const fast = (a: Asset, then: Message[], suffix = ''): AbilityOption => ({
  key: a.id + ':chaos' + suffix,
  label: 'ability.advancedTest',
  params: { card: cardName(a.code) },
  actions: 0,
  provokes: false,
  then,
})
export const take = (by: string, code: string, to: 'hand' | 'play' | 'deck'): Message => ({
  type: 'TakeSetAside',
  investigator: by,
  code,
  count: 1,
  to,
  bonded: true,
})
export const startTokens = (code: string, by: string, data: Data = {}): Message => ({
  type: 'StartTokenGroup',
  then: continuation(code, by, 'draw', { ...data, faces: '[]' }) as Extract<
    Message,
    { type: 'PlayerCardEffect' }
  >,
})
export const nextToken = (code: string, by: string, data: Data): Message => ({
  type: 'RevealTokenOutsideTest',
  investigator: by,
  hold: true,
  then: continuation(code, by, 'token', data) as Extract<Message, { type: 'PlayerCardEffect' }>,
})
