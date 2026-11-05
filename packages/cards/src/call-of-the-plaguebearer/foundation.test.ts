import { distancesFrom, recomputeConnections, type Difficulty } from '@lcg/engine'
import { newTestGame, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { PLAGUEBEARER_CHAOS_BAGS } from './campaign'
import { L, lateRisersLocations } from './locations'
import { lateRisersSpecific, lateRisersTokenEffect } from './tokens'

// Referencia Trasnochadores 1a/1b, lugares 8–15; RR «Skill Tests», ST.3–ST.8.
// El escenario genérico es un arnés; no sustituye preparación/actos/encuentros reales.
function game(difficulty: Difficulty = 'standard') {
  return {
    ...throughSetup(
      newTestGame({
        scenario: {
          locations: lateRisersLocations(),
          startingLocation: L.morgue,
        },
      }),
    ),
    difficulty,
  }
}

describe('Base de Trasnochadores', () => {
  it.each(['easy', 'standard', 'hard', 'expert'] as const)(
    'bolsa %s: 10 números y 7 símbolos, sin Antiguo',
    (difficulty) => {
      const bag = PLAGUEBEARER_CHAOS_BAGS[difficulty]
      expect(bag.filter((t) => typeof t === 'number')).toHaveLength(10)
      expect(bag.filter((t) => typeof t === 'string')).toEqual([
        'skull',
        'skull',
        'cultist',
        'tablet',
        'tablet',
        'autoFail',
        'elderSign',
      ])
    },
  )
  it('conserva las distribuciones numéricas de las cuatro dificultades', () => {
    expect(
      Object.values(PLAGUEBEARER_CHAOS_BAGS).map((bag) => bag.filter((t) => typeof t === 'number')),
    ).toEqual([
      [1, 1, 1, 0, 0, 0, -1, -1, -1, -2],
      [1, 0, 0, -1, -1, -1, -2, -2, -3, -4],
      [0, 0, -1, -1, -2, -3, -3, -3, -4, -5],
      [0, -1, -2, -2, -3, -3, -4, -4, -4, -6],
    ])
  })
  it('las conexiones impresas permiten alcanzar Omega y no conectan Morgue con el vestíbulo', () => {
    const s = game()
    expect(s.locations[L.morgue]!.connections).toEqual([L.omega])
    expect(distancesFrom(s, L.stairs).get(L.omega)).toBe(3)
    expect(s.locations[L.hallway]!.connections).toContain(L.delta)
    expect(s.locations[L.hallway]!.connections).toContain(L.tunnel)
  })
  it('las caras sin revelar conservan sus conexiones; cada llamada genera datos independientes', () => {
    const s = game()
    const revealed = recomputeConnections({
      ...s,
      locations: Object.fromEntries(
        Object.entries(s.locations).map(([id, l]) => [id, { ...l, revealed: true }]),
      ),
    })
    for (const id of Object.values(L))
      expect(revealed.locations[id]!.connections).toEqual(s.locations[id]!.connections)
    const first = lateRisersLocations()
    first[0]!.connectsTo!.push('extra')
    expect(lateRisersLocations()[0]!.connectsTo).toEqual(['diamond'])
  })
  it.each(['easy', 'standard', 'hard', 'expert'] as const)(
    'calavera %s: distancia real, incluida distancia cero',
    (difficulty) => {
      const s = game(difficulty)
      for (const [location, distance] of [
        [L.omega, 0],
        [L.morgue, 1],
        [L.stairs, 3],
      ] as const) {
        const state = { ...s, investigators: s.investigators.map((i) => ({ ...i, location })) }
        expect(lateRisersTokenEffect(state, 'skull', 'a').modifier).toBe(
          -(distance * (difficulty === 'hard' || difficulty === 'expert' ? 2 : 1)),
        )
      }
    },
  )
  it.each(['easy', 'standard', 'hard', 'expert'] as const)(
    'tablilla %s: fracaso en normal; final de prueba en difícil',
    (difficulty) => {
      const effect = lateRisersTokenEffect(game(difficulty), 'tablet', 'a')
      const hard = difficulty === 'hard' || difficulty === 'expert'
      expect(effect.modifier).toBe(hard ? -3 : -2)
      expect(effect.onFail?.length ?? 0).toBe(hard ? 0 : 1)
      expect(effect.after?.length ?? 0).toBe(hard ? 1 : 0)
      expect(effect.immediate).toBeUndefined()
    },
  )
  it('la tablilla mueve un solo paso y no mueve desde Omega', () => {
    let s = game()
    const apply = () => lateRisersSpecific(s, 'plaguebearer.moveTowardOmega', { investigator: 'a' })
    expect(apply().queue[0]).toEqual({ type: 'MoveTo', investigator: 'a', location: L.omega })
    s = { ...s, investigators: s.investigators.map((i) => ({ ...i, location: L.omega })) }
    expect(apply()).toBe(s)
  })
  it('los caminos empatados se eligen al resolver, entre lugares que acortan la distancia', () => {
    const s = game()
    const state = { ...s, investigators: s.investigators.map((i) => ({ ...i, location: L.delta })) }
    const result = lateRisersSpecific(state, 'plaguebearer.moveTowardOmega', { investigator: 'a' })
    expect(result.queue[0]).toMatchObject({
      type: 'Ask',
      question: { choices: [{ target: { id: L.lobby } }, { target: { id: L.alpha } }] },
    })
  })
})
