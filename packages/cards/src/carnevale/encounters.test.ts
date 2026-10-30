import { getInvestigator, type GameState } from '@lcg/engine'
import { choose, during, withBag } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { C } from './codes'
import { appendage, balefulReveler, poleman, sentinel, TREACHERIES } from './data'
import { masked, sacrificed, specific } from './helpers'
import { around, ring } from './topology'
import { boss, emit, game, settle } from './testing'

const reveal = (s: GameState, code: string, by = 'a') =>
  settle(
    emit(s, {
      type: 'ResolveEncounterCard',
      investigator: by,
      card: TREACHERIES.find((c) => c.code === code)!,
    }),
  )
const weak = (s: GameState) => ({
  ...withBag(-6)(s),
  investigators: s.investigators.map((i) => ({
    ...i,
    skills: { combat: 0, agility: 0, willpower: 0, intellect: 0 },
  })),
})
const maskedAt = (s: GameState, code: string) => {
  const p = masked(s).find((p) => p.code === `${code}b`)!
  return during(s, (state) => ({
    ...state,
    investigators: state.investigators.map((i) => ({
      ...i,
      location: p.placement.type === 'location' ? p.placement.location : null,
    })),
  }))
}

// RR "Revelation", "Nearest/Farthest", "Damage/Horror", "Must", "Peril".
describe('Traiciones (31–37)', () => {
  it('Histeria permite recibir 2 daños sin mover identidades', () => {
    let s = game()
    const before = masked(s)
    s = choose(reveal(s, C.hysteria), 'choice.carnevale.takeDamage')
    expect(getInvestigator(s, 'a').damage).toBe(2)
    expect(masked(s)).toEqual(before)
  })
  it('Histeria redistribuye en sentido horario y rompe el vínculo entre identificador público e identidad', () => {
    let s = game()
    const before = masked(s),
      from = getInvestigator(s, 'a').location!
    s = choose(reveal(s, C.hysteria), 'choice.carnevale.shuffleMasked')
    const after = masked(s)
    expect(after.map((p) => p.code).sort()).toEqual(before.map((p) => p.code).sort())
    expect(after.every((p) => !before.some((old) => old.id === p.id))).toBe(true)
    expect(after.map((p) => p.placement)).toEqual(
      Array.from({ length: 7 }, (_, n) => ({
        type: 'location',
        location: around(ring(s), from, n + 1),
      })),
    )
    expect(after.every((p) => p.faceDown)).toBe(true)
  })
  it('Histeria sin enmascarados exige los daños', () => {
    let s = during(game(), (state) => ({ ...state, placedAssets: {} }))
    s = reveal(s, C.hysteria)
    expect(getInvestigator(s, 'a').damage).toBe(2)
  })
  it.each([true, false])(
    'Perdido permite elegir horror o moverse enfrente (movimiento: %s)',
    (move) => {
      let s = game()
      const from = getInvestigator(s, 'a').location!
      s = settle(
        choose(
          reveal(s, C.lost),
          move ? 'choice.carnevale.moveAcross' : 'choice.carnevale.takeHorror',
        ),
      )
      expect(getInvestigator(s, 'a').location).toBe(move ? around(ring(s), from, 4) : from)
      expect(getInvestigator(s, 'a').horror).toBe(move ? 0 : 2)
      expect(getInvestigator(s, 'a').damage).toBe(0)
    },
  )
  it('sin Lugar enfrente, Perdido aplica horror, nunca daño', () => {
    let s = during(game(), (state) => ({
      ...state,
      scenarioMeta: { ...state.scenarioMeta, carnevaleRing: '' },
    }))
    s = reveal(s, C.lost)
    expect(getInvestigator(s, 'a').horror).toBe(2)
    expect(getInvestigator(s, 'a').damage).toBe(0)
  })
  it.each([C.gaze, C.water])(
    '%s prueba al que roba y a cada controlador de inocentes, priorizando solo a los inocentes',
    (code) => {
      let s = emit(game(3), {
        type: 'PutAssetIntoPlay',
        code: C.innocent,
        investigator: 'a',
        noSlot: true,
      })
      const a = Object.values(s.assets).find((a) => a.code === C.innocent)!
      s = during(s, weak)
      s = settle(reveal(s, code, 'b'))
      expect([s.assets[a.id]?.damage, s.assets[a.id]?.horror]).toEqual(
        code === C.water ? [1, 0] : [0, 1],
      )
      expect([getInvestigator(s, 'a').damage, getInvestigator(s, 'a').horror]).toEqual([0, 0])
      expect([getInvestigator(s, 'b').damage, getInvestigator(s, 'b').horror]).toEqual(
        code === C.water ? [1, 0] : [0, 1],
      )
      expect([getInvestigator(s, 'c').damage, getInvestigator(s, 'c').horror]).toEqual([0, 0])
    },
  )
  it('un investigador que roba y controla varios inocentes solo hace una prueba', () => {
    let s = emit(
      game(),
      { type: 'PutAssetIntoPlay', code: C.innocent, investigator: 'a', noSlot: true },
      { type: 'PutAssetIntoPlay', code: C.innocent, investigator: 'a', noSlot: true },
    )
    s = during(s, weak)
    s = settle(reveal(s, C.water))
    expect(Object.values(s.assets).reduce((n, a) => n + a.damage, 0)).toBe(1)
  })
  it('Hipnotizar descubre al inocente, lo desplaza al Lugar vacío horario más alejado y le da daño y horror', () => {
    let s = maskedAt(game(), C.innocent)
    const from = getInvestigator(s, 'a').location!
    const id = masked(s).find((p) => p.code === `${C.innocent}b`)!.id
    s = reveal(s, C.mesmerize)
    const p = s.placedAssets![id]!
    expect(p.code).toBe(C.innocent)
    expect(p.placement).toEqual({ type: 'location', location: around(ring(s), from, 7) })
    expect([p.damage, p.horror]).toEqual([1, 1])
  })
  it('Hipnotizar no hace atacar a un servidor que descubre', () => {
    let s = maskedAt(game(), C.lagorio)
    s = reveal(s, C.mesmerize)
    expect(Object.values(s.enemies).some((e) => e.code === C.lagorio)).toBe(true)
    expect(getInvestigator(s, 'a').damage).toBe(0)
  })
  it('Hipnotizar sin enmascarados tiene Oleada y roba un encuentro más', () => {
    let s = during(game(), (state) => ({ ...state, encounterDeck: [appendage] }))
    s = reveal(s, C.mesmerize)
    expect(Object.values(s.enemies).map((e) => e.code)).toEqual([C.appendage])
    expect(s.encounterDeck).toHaveLength(0)
  })
  it('Secuestro permite perder todos los recursos al fallar voluntad 3', () => {
    let s = during(game(), weak)
    s = reveal(s, C.abduction)
    expect(getInvestigator(s, 'a').resources).toBe(0)
  })
  it('Secuestro puede descartar al inocente y entonces se resuelve su sacrificio', () => {
    let s = emit(game(), {
      type: 'PutAssetIntoPlay',
      code: C.innocent,
      investigator: 'a',
      noSlot: true,
    })
    s = during(s, weak)
    s = choose(reveal(s, C.abduction), 'choice.discard')
    expect(sacrificed(s)).toEqual([C.innocent])
    expect(getInvestigator(s, 'a').resources).toBe(5)
    expect(getInvestigator(s, 'a').horror).toBe(1)
  })
  it('con cero recursos y un Aliado descartable no permite escoger perder cero recursos', () => {
    let s = emit(game(), {
      type: 'PutAssetIntoPlay',
      code: C.innocent,
      investigator: 'a',
      noSlot: true,
    })
    s = during(s, (state) => ({
      ...weak(state),
      investigators: weak(state).investigators.map((i) => ({ ...i, resources: 0 })),
    }))
    s = reveal(s, C.abduction)
    expect(sacrificed(s)).toEqual([C.innocent])
  })
  it('superar Secuestro no descarta ni quita recursos', () => {
    let s = during(game(), withBag(1))
    s = reveal(s, C.abduction)
    expect(getInvestigator(s, 'a').resources).toBe(5)
  })
  it('Miasma se vincula al Lugar más cercano sin otra copia, incluido el actual, sin probar al revelarse', () => {
    let s = game()
    const from = getInvestigator(s, 'a').location!
    s = reveal(s, C.miasma)
    expect(Object.values(s.treacheries)[0]?.placement).toEqual({ type: 'location', location: from })
    expect(getInvestigator(s, 'a').horror).toBe(0)
    s = reveal(s, C.miasma)
    expect(Object.values(s.treacheries).map((t) => t.placement)).toEqual([
      { type: 'location', location: from },
      { type: 'location', location: around(ring(s), from) },
    ])
  })
  it('entrar en Miasma provoca voluntad 2 y al fallar aplica daño y horror si no hay Cazadores que mover', () => {
    let s = reveal(game(), C.miasma)
    const from = getInvestigator(s, 'a').location!
    s = during(s, weak, { type: 'MoveTo', investigator: 'a', location: around(ring(s), from)! })
    s = settle(s)
    s = settle(emit(s, { type: 'MoveTo', investigator: 'a', location: from }))
    expect([getInvestigator(s, 'a').damage, getInvestigator(s, 'a').horror]).toEqual([1, 1])
  })
  it('al fallar Miasma puede resolver Cazador en vez de sufrir daño y horror', () => {
    let s = reveal(game(), C.miasma)
    const from = getInvestigator(s, 'a').location!,
      start = around(ring(s), from, 3)!
    s = emit(s, {
      type: 'SpawnEnemy',
      card: { ...poleman, code: 'test-hunter' },
      location: start,
      engageWith: null,
    })
    s = settle(
      during(s, weak, { type: 'MoveTo', investigator: 'a', location: around(ring(s), from)! }),
    )
    s = emit(s, { type: 'MoveTo', investigator: 'a', location: from })
    s = choose(settle(s), 'choice.carnevale.moveHunters')
    expect(Object.values(s.enemies)[0]?.location).toBe(around(ring(s), start))
    expect([getInvestigator(s, 'a').damage, getInvestigator(s, 'a').horror]).toEqual([0, 0])
  })
})

describe('Enemigos de encuentros (28–30 y 2b)', () => {
  it('el Centinela aparece enfrente del investigador que lo roba', () => {
    let s = game()
    const from = getInvestigator(s, 'a').location!
    s = emit(s, { type: 'ResolveEncounterCard', investigator: 'a', card: sentinel })
    expect(Object.values(s.enemies)[0]?.location).toBe(around(ring(s), from, 4))
  })
  it('el Barquero aparece en el Canal y desempata presa por número de inocentes controlados', () => {
    let s = emit(game(2), {
      type: 'PutAssetIntoPlay',
      code: C.innocent,
      investigator: 'b',
      noSlot: true,
    })
    s = during(
      s,
      (state) => ({
        ...state,
        investigators: state.investigators.map((i) => ({ ...i, location: C.canal })),
      }),
      { type: 'ResolveEncounterCard', investigator: 'a', card: poleman },
    )
    expect(Object.values(s.enemies)[0]?.location).toBe(C.canal)
    expect(Object.values(s.enemies)[0]?.engagedWith).toBe('b')
  })
  it('tras atacar, el Apéndice hace descartar una carta aleatoria; descartarlo no daña a Cnidathqua', () => {
    let s = emit(game(), specific('carnevaleBoss'), {
      type: 'SpawnEnemy',
      card: appendage,
      location: C.basilica,
      engageWith: 'a',
    })
    const e = Object.values(s.enemies).find((e) => e.code === C.appendage)!,
      hand = getInvestigator(s, 'a').hand.length
    s = emit(s, { type: 'EnemyAttack', enemy: e.id, investigator: 'a', exhaustAfter: false })
    expect(getInvestigator(s, 'a').hand.length).toBe(hand - 1)
    s = emit(s, { type: 'DiscardEnemy', enemy: e.id })
    expect(boss(s).damageTaken).toBe(0)
  })
  it.each([true, false])(
    'el Carnavalero resuelve Cazador otra vez solo si revela símbolo (símbolo: %s)',
    (symbol) => {
      let s = game()
      const from = around(ring(s), C.basilica, 3)!
      s = emit(s, { type: 'SpawnEnemy', card: balefulReveler, location: from, engageWith: null })
      s = during(s, withBag(symbol ? 'skull' : -2), { type: 'HuntersMove' })
      expect(Object.values(s.enemies)[0]?.location).toBe(around(ring(s), from, symbol ? 2 : 1))
      const before = Object.values(s.enemies)[0]!.location
      s = emit(s, { type: 'HuntersMove' })
      expect(Object.values(s.enemies)[0]?.location).toBe(around(ring(s), before))
      expect(getInvestigator(s, 'a').horror).toBe(0)
      expect(s.chaosBag).toEqual([symbol ? 'skull' : -2])
    },
  )
})
