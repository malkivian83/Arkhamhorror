import { type GameState, type Message } from '@lcg/engine'
import { ALTERED_PATHS } from './doom-codes'
export const doomSpecific = (
  key: string,
  data: Record<string, string | number | boolean> = {},
): Message => ({ type: 'ScenarioSpecific', key, data })
export const atAltered = (s: GameState, l: string | null) =>
  !!l && !!s.locations[l]?.revealed && ALTERED_PATHS.includes(l)
