import { type GameState, type InvestigatorId, type Message } from '@lcg/engine'
export const trainSpecific = (
  key: string,
  data: Record<string, string | number | boolean> = {},
): Message => ({ type: 'ScenarioSpecific', key, data })
export const trainCars = (s: GameState) =>
  Object.values(s.locations)
    .filter((l) => Number(l.id) >= 2167 && Number(l.id) <= 2177)
    .sort((a, b) => (a.position?.[0] ?? 0) - (b.position?.[0] ?? 0))
export const trainNeighbor = (s: GameState, location: string, direction: -1 | 1) => {
  const cards = trainCars(s),
    index = cards.findIndex((l) => l.id === location)
  return cards[index + direction]?.id
}
export const trainAllHorror = (s: GameState, exclude?: InvestigatorId): Message[] =>
  s.investigators
    .filter((i) => !i.eliminated && i.id !== exclude)
    .map((i) => ({ type: 'TakeDamage', investigator: i.id, damage: 0, horror: 1 }))
