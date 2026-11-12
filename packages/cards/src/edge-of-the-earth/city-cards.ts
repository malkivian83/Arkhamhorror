import {
  seedRng,
  shuffle,
  type ChaosToken,
  type GameState,
  type LocationCard,
  type LocationId,
} from '@lcg/engine'

export const TUNNEL = '08630'
export const CITY_TERROR = '08641'
export const BENIGN = '08642'
export const REAWAKENED = '08643'
export type CityVersion = 1 | 2 | 3

/** City Landscapes: code, name, shroud, clues per investigator and copies. */
const landscapes: [string, string, number, number, number][] = [
  ['08631', 'Ancient Planetarium', 2, 1, 1],
  ['08632', 'Stone Bridge', 3, 1, 3],
  ['08633', 'Cylindrical Tower', 2, 1, 1],
  ['08634', 'Labyrinthine Chamber', 3, 2, 2],
  ['08635', 'Map Room', 2, 1, 1],
  ['08636', 'Roofless Rampart', 2, 1, 1],
  ['08637', 'Ruinous Streets', 4, 1, 2],
  ['08638', 'Cyclopean Spires', 3, 1, 1],
  ['08639', 'Submerged Passageway', 5, 1, 2],
  ['08640', 'Temple of the Elder Things', 4, 1, 2],
]

/** Campaign guide, pp. 39–41: [column, row] of the 16 City Landscapes and of the tunnel. */
export const cityMaps: Record<
  CityVersion,
  { landscapes: [number, number][]; tunnel: [number, number] }
> = {
  1: {
    landscapes: [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
      [0, 2],
      [1, 2],
      [3, 2],
      [4, 2],
      [0, 3],
      [1, 3],
      [2, 3],
      [3, 3],
      [2, 4],
      [3, 4],
    ],
    tunnel: [2, 2],
  },
  2: {
    landscapes: [
      [3, 1],
      [4, 1],
      [5, 1],
      [2, 2],
      [3, 2],
      [4, 2],
      [5, 2],
      [6, 2],
      [1, 3],
      [2, 3],
      [6, 3],
      [7, 3],
      [0, 4],
      [1, 4],
      [7, 4],
      [8, 4],
    ],
    tunnel: [4, 0],
  },
  3: {
    landscapes: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
      [2, 2],
      [3, 2],
      [4, 2],
      [5, 2],
      [3, 3],
      [4, 3],
      [5, 3],
      [6, 3],
      [5, 4],
      [6, 4],
    ],
    tunnel: [7, 4],
  },
}
/** Version I: the lead chooses one of the 8 outermost locations (the ends of the arms). */
export const outermost: [number, number][] = [
  [1, 0],
  [2, 0],
  [4, 1],
  [4, 2],
  [0, 2],
  [0, 3],
  [2, 4],
  [3, 4],
]
/** Versions II and III: bottom right and top left. */
export const cityStart: Partial<Record<CityVersion, [number, number]>> = { 2: [8, 4], 3: [0, 0] }

/** Campaign guide, p. 37: two of each, placed at random as keys on the City Landscapes. */
export const cityKeys: ChaosToken[] = (
  ['skull', 'cultist', 'tablet', 'elderThing', 0, -1, -2, -3] as ChaosToken[]
).flatMap((token) => [token, token])

const at = ([column, row]: [number, number]) => `${column},${row}`

/** The random revealed sides and keys of one City of the Elder Things game. */
export function cityLocations(version: CityVersion, seed: number) {
  const map = cityMaps[version]
  const cards = landscapes.flatMap(([code, name, shroud, clues, copies]) =>
    Array.from({ length: copies }, (_, n) => ({
      id: n ? `${code}~${n + 1}` : code,
      name,
      shroud,
      clues,
    })),
  )
  const [sides, rng] = shuffle(cards, seedRng(seed))
  const [keys] = shuffle(cityKeys, rng)
  const grid = new Map<string, string>([[at(map.tunnel), TUNNEL]])
  map.landscapes.forEach((position, n) => grid.set(at(position), sides[n]!.id))
  const neighbours = ([column, row]: [number, number]) =>
    [
      [column, row - 1],
      [column + 1, row],
      [column, row + 1],
      [column - 1, row],
    ]
      .map((position) => grid.get(at(position as [number, number])))
      .filter((id): id is string => !!id)
  const locations: LocationCard[] = [
    {
      id: TUNNEL,
      name: 'Hidden Tunnel',
      unrevealedName: 'Hidden Tunnel',
      shroud: 0,
      clueValue: 2,
      cluesPerInvestigator: true,
      victory: 1,
      position: map.tunnel,
      connections: neighbours(map.tunnel),
    },
    ...map.landscapes.map((position, n): LocationCard => {
      const side = sides[n]!
      return {
        id: side.id,
        name: side.name,
        unrevealedName: 'City Landscape',
        shroud: side.shroud,
        clueValue: side.clues,
        cluesPerInvestigator: true,
        ...(side.id.startsWith('08634') ? { victory: 1 } : {}),
        position,
        connections: neighbours(position),
      }
    }),
  ]
  const keyed = map.landscapes.map((_, n) => ({ location: sides[n]!.id, key: keys[n]! }))
  const idAt = (position: [number, number]) => grid.get(at(position))!
  return { locations, keyed, idAt }
}

/** Locations in the same column or row (City Landscapes and the tunnel). */
export function sameLine(state: GameState, location: LocationId | null): LocationId[] {
  const here = location ? state.locations[location]?.position : undefined
  if (!here) return []
  return Object.values(state.locations)
    .filter(
      ({ id, position }) =>
        id !== location && !!position && (position[0] === here[0] || position[1] === here[1]),
    )
    .map(({ id }) => id)
}
