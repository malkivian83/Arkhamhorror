import type { GameState, LocationId } from '@lcg/engine'

/** Orden físico, horario, fijado en la preparación. No depende de revelaciones. */
export function ring(state: GameState): LocationId[] {
  return String(state.scenarioMeta?.carnevaleRing ?? '')
    .split(',')
    .filter(Boolean)
}

/** El reglamento permite contar en sentido contrario solo cuando lo indica un efecto. */
export function around(
  order: readonly LocationId[],
  from: LocationId,
  steps = 1,
): LocationId | null {
  const start = order.indexOf(from)
  if (start < 0 || order.length !== 8) return null
  return order[(((start + steps) % order.length) + order.length) % order.length] ?? null
}

export const across = (order: readonly LocationId[], from: LocationId) => around(order, from, 4)

/** Incluye el lugar de origen: una carta en tu Lugar está a distancia cero. */
export function nearestAround(
  order: readonly LocationId[],
  from: LocationId,
  matches: (id: LocationId) => boolean,
  direction: 1 | -1 = 1,
): LocationId | null {
  for (let distance = 0; distance < order.length; distance++) {
    const id = around(order, from, distance * direction)
    if (id && matches(id)) return id
  }
  return null
}
