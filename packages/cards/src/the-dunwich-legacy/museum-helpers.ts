import { type GameState, type Message } from '@lcg/engine'
import { M } from './museum-codes'
export const museumSpecific = (
  key: string,
  data: Record<string, string | number | boolean> = {},
): Message => ({ type: 'ScenarioSpecific', key, data })
export const horrorInPlay = (s: GameState) =>
  Object.values(s.enemies).find((e) => e.code === M.horror)
