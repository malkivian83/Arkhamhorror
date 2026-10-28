import { type GameState, type Message } from '@lcg/engine'
export const altarSpecific = (
  key: string,
  data: Record<string, string | number | boolean> = {},
): Message => ({ type: 'ScenarioSpecific', key, data })
export const altarList = (s: GameState, key: string) =>
  String(s.scenarioMeta?.[key] ?? '')
    .split(',')
    .filter(Boolean)
