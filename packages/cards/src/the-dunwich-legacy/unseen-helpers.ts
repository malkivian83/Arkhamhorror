import { type GameState, type Message, type Enemy } from '@lcg/engine'
import { U } from './unseen-codes'
export const unseenSpecific = (
  key: string,
  data: Record<string, string | number | boolean> = {},
): Message => ({ type: 'ScenarioSpecific', key, data })
export const broods = (s: GameState) => Object.values(s.enemies).filter((e) => e.code === U.brood)
export const unseenEnemyChoice = (s: GameState, e: Enemy) => ({
  label: 'choice.unseen.enemy',
  params: {
    enemy: e.name,
    location: s.locations[e.location]?.name ?? e.location,
    clues: e.clues ?? 0,
    damage: e.damageTaken,
  },
  target: { type: 'enemy' as const, id: e.id },
})
