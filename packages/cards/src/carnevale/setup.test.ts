import { createGame, distancesFrom, recomputeConnections } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { starterInvestigator } from '../core-2026/player-cards'
import { C, CHAOS_BAGS, LOCATIONS, carnevaleSetup, prepareCarnevale } from './setup'
import { across, around, nearestAround } from './topology'

describe('Carnevale: preparación y geografía (guía, pp. 2 y 5–7)', () => {
  it('retira un Lugar permitido y conserva un único círculo horario de ocho Lugares', () => {
    // Guía: ni la Basílica ni el Canal pueden ser el Lugar retirado.
    const removed = new Set<string>()
    for (let seed = 1; seed <= 64; seed++) {
      const prepared = prepareCarnevale(seed)
      removed.add(prepared.removed)
      expect(prepared.locations).toHaveLength(8)
      expect(prepared.locations.map((l) => l.id)).toContain(C.basilica)
      expect(prepared.locations.map((l) => l.id)).toContain(C.canal)
      expect(prepared.locations.map((l) => l.id)).not.toContain(prepared.removed)
      const visited = new Set<string>()
      let current: string = C.basilica
      for (let step = 0; step < 8; step++) {
        expect(visited.has(current)).toBe(false)
        visited.add(current)
        const l = prepared.locations.find((l) => l.id === current)!
        expect(l.connections).toHaveLength(1)
        current = l.connections[0]!
      }
      expect(current).toBe(C.basilica)
      expect(new Set(prepared.locations.map((l) => l.position?.join(','))).size).toBe(8)
    }
    expect([...removed].sort()).toEqual(
      LOCATIONS.filter((l) => l.id !== C.basilica && l.id !== C.canal)
        .map((l) => l.id)
        .sort(),
    )
  })

  it('coloca siete enmascarados: cuatro servidores diferentes y tres inocentes', () => {
    const { setup } = prepareCarnevale(7)
    const placed = setup.filter((m) => m.type === 'PlaceAsset')
    const masked = placed.filter((m) => m.faceDown)
    expect(masked).toHaveLength(7)
    expect(masked.map((m) => m.code).sort()).toEqual(
      [
        `${C.lagorio}b`,
        `${C.magro}b`,
        `${C.neri}b`,
        `${C.corvi}b`,
        `${C.innocent}b`,
        `${C.innocent}b`,
        `${C.innocent}b`,
      ].sort(),
    )
    expect(masked.every((m) => m.name === 'Masked Carnevale-Goer')).toBe(true)
    expect(
      new Set(masked.map((m) => (m.placement.type === 'location' ? m.placement.location : '')))
        .size,
    ).toBe(7)
    expect(
      masked.some((m) => m.placement.type === 'location' && m.placement.location === C.basilica),
    ).toBe(false)
    expect(placed.find((m) => m.code === C.abbess)?.placement).toEqual({
      type: 'location',
      location: C.basilica,
    })
  })

  it('reproduce la preparación con la misma semilla sin compartir objetos mutables', () => {
    expect(prepareCarnevale(42)).toEqual(prepareCarnevale(42))
    expect(prepareCarnevale(42)).not.toEqual(prepareCarnevale(43))
    const changed = prepareCarnevale(42)
    changed.locations[0]!.connections.length = 0
    changed.chaosBag.length = 0
    expect(prepareCarnevale(42).locations[0]!.connections).toHaveLength(1)
    expect(prepareCarnevale(42).chaosBag).toHaveLength(19)
  })

  it('respeta las dos bolsas impresas, también al usar Fácil o Experto', () => {
    expect(CHAOS_BAGS.easy).toEqual(CHAOS_BAGS.standard)
    expect(CHAOS_BAGS.expert).toEqual(CHAOS_BAGS.hard)
    expect(CHAOS_BAGS.standard).toEqual([
      1,
      0,
      0,
      0,
      -1,
      -1,
      -1,
      -2,
      -3,
      -4,
      -6,
      'skull',
      'skull',
      'skull',
      'cultist',
      'tablet',
      'elderThing',
      'autoFail',
      'elderSign',
    ])
    expect(CHAOS_BAGS.hard).toEqual([
      1,
      0,
      0,
      0,
      -1,
      -1,
      -3,
      -4,
      -5,
      -6,
      -7,
      'skull',
      'skull',
      'skull',
      'cultist',
      'tablet',
      'elderThing',
      'autoFail',
      'elderSign',
    ])
  })

  it('el motor conserva las conexiones dirigidas y las distancias al reconstruir el mapa', () => {
    const scenario = carnevaleSetup({ seed: 42 })
    const game = recomputeConnections(
      createGame({ seed: 42, scenario, investigators: [starterInvestigator('daniela')] }),
    )
    const order = scenario.locations.map((l) => l.id)
    const distances = distancesFrom(game, C.basilica)
    for (let step = 0; step < 8; step++) {
      expect(distances.get(order[step]!)).toBe(step)
      expect(game.locations[order[step]!]!.connections).toEqual([order[(step + 1) % 8]])
    }
  })

  it('distingue enfrente, horario y antihorario sin inventar conexiones', () => {
    const order = prepareCarnevale(5).locations.map((l) => l.id)
    expect(across(order, order[0]!)).toBe(order[4])
    expect(across(order, across(order, order[0]!)!)).toBe(order[0])
    expect(around(order, order[0]!, -1)).toBe(order[7])
    const targets = new Set([order[1], order[7]])
    expect(nearestAround(order, order[0]!, (l) => targets.has(l))).toBe(order[1])
    expect(nearestAround(order, order[0]!, (l) => targets.has(l), -1)).toBe(order[7])
    expect(nearestAround(order, order[0]!, (l) => l === order[0])).toBe(order[0])
    expect(nearestAround(order, order[0]!, () => false)).toBeNull()
    // La Góndola sustituye al círculo: no existe un Lugar enfrente de ella.
    expect(across([C.gondola], C.gondola)).toBeNull()
    expect(around(order, C.gondola)).toBeNull()
  })
})
