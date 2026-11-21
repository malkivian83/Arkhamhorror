import { describe, expect, it } from 'vitest'
import { dispatch } from './engine'
import { emptyAdjacentPositions, gridNeighbors } from './state'
import { newTestGame } from './testing'
import type { GameState, LocationCard } from './types'

const at = (id: string, position: [number, number]): LocationCard => ({
  id,
  name: id,
  shroud: 1,
  clueValue: 0,
  cluesPerInvestigator: false,
  connections: [],
  position,
})
const game = (): GameState => ({
  ...newTestGame({
    scenario: {
      grid: true,
      locations: [at('a', [1, 1]), at('b', [2, 1]), at('c', [2, 2]), at('d', [4, 1])],
      startingLocation: 'a',
    },
  }),
  queue: [],
  pending: null,
})
const links = (state: GameState, id: string) => [...state.locations[id]!.connections].sort()

// Guía de La fiesta del Valle de la Cicuta, p. 3, «Adyacencia de Lugares en esta campaña»
// y p. 11, «Deslizar e intercambiar Lugares».
describe('Cuadrícula de Lugares', () => {
  it('conecta los Lugares que comparten un lado, no los de una esquina', () => {
    const state = game()
    expect(links(state, 'a')).toEqual(['b'])
    expect(links(state, 'b')).toEqual(['a', 'c'])
    expect(links(state, 'd')).toEqual([])
    expect(
      gridNeighbors(state, 'b')
        .map((l) => l.id)
        .sort(),
    ).toEqual(['a', 'c'])
    expect(emptyAdjacentPositions(state, 'a')).toEqual([
      [1, 0],
      [1, 2],
      [0, 1],
    ])
  })

  it('desliza a un espacio vacío con sus cartas y recalcula la adyacencia', () => {
    const start = game()
    const withInvestigator = {
      ...start,
      investigators: start.investigators.map((i) => ({ ...i, location: 'd' })),
    }
    const slid = dispatch(withInvestigator, {
      type: 'SlideLocation',
      location: 'd',
      position: [3, 1],
    })
    expect(slid.locations.d!.position).toEqual([3, 1])
    expect(links(slid, 'd')).toEqual(['b'])
    expect(slid.investigators[0]!.location).toBe('d')
    // No se puede deslizar a un espacio ocupado.
    expect(
      dispatch(slid, { type: 'SlideLocation', location: 'd', position: [2, 1] }).locations.d!
        .position,
    ).toEqual([3, 1])
  })

  it('intercambia dos Lugares', () => {
    const swapped = dispatch(game(), { type: 'SwapLocations', a: 'a', b: 'c' })
    expect(swapped.locations.a!.position).toEqual([2, 2])
    expect(swapped.locations.c!.position).toEqual([1, 1])
    expect(links(swapped, 'c')).toEqual(['b'])
    expect(links(swapped, 'a')).toEqual(['b'])
  })
})
