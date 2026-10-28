import { printedCode, type GameState, type Message } from '@lcg/engine'
import { L } from './lost-codes'
export const lostSpecific = (
  key: string,
  data: Record<string, string | number | boolean> = {},
): Message => ({ type: 'ScenarioSpecific', key, data })
const extra: string[] = [L.space, L.cascade, L.bridge, L.steps, L.doorway]
export const isExtradimensional = (s: GameState, id: string | null) =>
  !!id && !!s.locations[id] && extra.includes(printedCode(id))
export const extradimensional = (s: GameState) =>
  Object.values(s.locations).filter((l) => isExtradimensional(s, l.id))
