import {
  activeInvestigators,
  getInvestigator,
  placedLocation,
  type GameState,
  type Message,
  type PlacedAsset,
} from '@lcg/engine'
import { C } from './setup'

export type Data = Record<string, string | number | boolean>
export const specific = (
  key: string,
  data: Data = {},
): Extract<Message, { type: 'ScenarioSpecific' }> => ({
  type: 'ScenarioSpecific',
  key,
  data,
})
export const MASKED_CODES = [C.lagorio, C.magro, C.neri, C.corvi, C.innocent].map(
  (code) => `${code}b`,
)
export const masked = (s: GameState): PlacedAsset[] =>
  Object.values(s.placedAssets ?? {}).filter((p) => MASKED_CODES.includes(p.code))
export const rescued = (s: GameState) => s.scenarioDecks?.carnevaleRescued ?? []
export const sacrificed = (s: GameState) => s.scenarioDecks?.carnevaleSacrificed ?? []
export const here = (s: GameState, p: PlacedAsset, investigator: string) =>
  placedLocation(s, p) === getInvestigator(s, investigator).location
export const canLook = (s: GameState, p: PlacedAsset) =>
  !Object.values(s.enemies).some(
    (e) => e.code === C.sentinel && e.location === placedLocation(s, p),
  )
export const investigatorsAt = (s: GameState, location: string) =>
  activeInvestigators(s).filter((i) => i.location === location)

type Handler = (s: GameState, data: Data) => GameState
const handlers = new Map<string, Handler>()
export const onSpecific = (key: string, handler: Handler) => {
  handlers.set(key, handler)
}
export const runSpecific = (s: GameState, key: string, data: Data) =>
  handlers.get(key)?.(s, data) ?? s
