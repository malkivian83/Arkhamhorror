import type { LocationCard } from '@lcg/engine'

// Prefijo 78: sin entradas en el catálogo congelado al iniciar este módulo.
// Colección 8–15; originales ES 008–015 (ambas caras), nombres EN 08–15.
export const L = {
  morgue: '78008',
  omega: '78009',
  lobby: '78010',
  alpha: '78011',
  delta: '78012',
  tunnel: '78013',
  stairs: '78014',
  hallway: '78015',
} as const

const location = (
  id: string,
  name: string,
  shroud: number,
  clueValue: number,
  symbol: string,
  connectsTo: string[],
  victory = 0,
): LocationCard => ({
  id,
  name,
  shroud,
  clueValue,
  cluesPerInvestigator: true,
  connections: [],
  symbol,
  connectsTo,
  unrevealed: { symbol, connectsTo: [...connectsTo] },
  ...(victory ? { victory } : {}),
})

/** Datos impresos; la preparación aparta todo salvo Morgue y Lab Omega. */
export const lateRisersLocations = (): LocationCard[] =>
  [
    location(L.morgue, 'Morgue', 2, 2, 'circle', ['diamond']),
    location(L.omega, 'Lab Omega', 4, 1, 'diamond', ['circle', 'moon', 'squiggle'], 1),
    location(L.lobby, 'Central Lobby', 3, 0, 'squiggle', ['triangle', 'diamond', 'moon', 'plus']),
    location(L.alpha, 'Lab Alpha', 3, 2, 'moon', ['diamond', 'triangle', 'squiggle'], 1),
    location(L.delta, 'Lab Delta', 2, 2, 'triangle', ['moon', 'squiggle', 'doubleSlash'], 1),
    location(L.tunnel, 'The Tunnel', 3, 0, 'plus', ['tee', 'doubleSlash', 'squiggle']),
    location(L.stairs, 'Narrow Stair', 1, 3, 'tee', ['plus'], 2),
    location(L.hallway, 'Torn Hallway', 4, 1, 'doubleSlash', ['triangle', 'plus'], 1),
  ].map((l, index) => ({
    ...l,
    position: (
      [
        [0, 0],
        [1, 0],
        [2, 0],
        [2, 1],
        [3, 0],
        [2, 2],
        [2, 3],
        [3, 1],
      ] as [number, number][]
    )[index]!,
  }))
