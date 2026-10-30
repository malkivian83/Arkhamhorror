import { createGame, getInvestigator, type GameState, type Message } from '@lcg/engine'
import {
  choose,
  during,
  labels,
  testInvestigator,
  throughSetup,
  withBag,
} from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { masked, rescued, sacrificed, specific } from './helpers'
import { carnevaleOfHorrors } from './scenario'
import { C } from './setup'
import { enemy } from '../scenario-helpers'

function game(players = 1): GameState {
  let s = throughSetup(
    createGame({
      seed: 42,
      scenario: carnevaleOfHorrors({ seed: 42 }),
      investigators: ['a', 'b', 'c'].slice(0, players).map((id) => testInvestigator(id)),
    }),
  )
  while (s.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    s = choose(s, 'choice.investigator', { name: 'A' })
  return s
}
function atMasked(s: GameState, code: string, clues = 2): GameState {
  const p = masked(s).find((p) => p.code === `${code}b`)!
  const location = p.placement.type === 'location' ? p.placement.location : ''
  return during(s, (state) => ({
    ...state,
    investigators: state.investigators.map((i) => ({ ...i, location, clues })),
  }))
}
function unmask(s: GameState, code: string): GameState {
  const p = masked(s).find((p) => p.code === `${code}b`)!
  return during(s, (state) => state, specific('carnevaleFlip', { placed: p.id }))
}
const damage = (s: GameState, id = 'a') => {
  const i = getInvestigator(s, id)
  return [i.damage, i.horror]
}

describe('Enmascarados (cartas 17b–21b)', () => {
  it.each([C.lagorio, C.magro, C.neri, C.corvi])(
    'la acción transforma %s y resuelve su ataque, pagando acción y pista',
    (code) => {
      let s = atMasked(game(), code)
      const before = getInvestigator(s, 'a').actionsRemaining
      s = choose(s, 'ability.carnevale.unmask')
      expect(masked(s).some((p) => p.code === `${code}b`)).toBe(false)
      const e = Object.values(s.enemies).find((e) => e.code === code)!
      expect(e).toBeDefined()
      expect(e.exhausted).toBe(false)
      expect(getInvestigator(s, 'a').clues).toBe(1)
      expect(getInvestigator(s, 'a').actionsRemaining).toBe(before - 1)
      expect(damage(s)).toEqual([e.damage, e.horror])
      expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
    },
  )

  it('cada investigador del Lugar recibe el ataque; el jefe decide el orden', () => {
    let s = atMasked(game(2), C.lagorio)
    s = choose(s, 'ability.carnevale.unmask')
    expect(s.pending?.question.prompt).toBe('prompt.carnevale.attackOrder')
    s = choose(s, 'choice.investigator', { name: 'B' })
    expect(damage(s, 'b')).toEqual([2, 0])
    expect(damage(s, 'a')).toEqual([2, 0])
  })

  it.each([C.lagorio, C.magro, C.neri, C.corvi])(
    'un efecto que descubre %s no activa el ataque de la habilidad',
    (code) => {
      let s = atMasked(game(), code)
      s = unmask(s, code)
      expect(Object.values(s.enemies).filter((e) => e.code === code)).toHaveLength(1)
      expect(damage(s)).toEqual([0, 0])
      expect(getInvestigator(s, 'a').clues).toBe(2)
    },
  )

  it.each([C.lagorio, C.magro, C.neri, C.corvi, C.innocent])(
    'mirar %s muestra la identidad; solo Elisabetta se descubre',
    (code) => {
      let s = atMasked(game(), code)
      const p = masked(s).find((p) => p.code === `${code}b`)!
      s = during(
        s,
        (state) => state,
        specific('carnevaleLook', { placed: p.id, investigator: 'a' }),
      )
      expect(labels(s)).toEqual([`choice.carnevale.identity.${code}`])
      s = choose(s, `choice.carnevale.identity.${code}`)
      expect(!!s.placedAssets?.[p.id]).toBe(code !== C.magro)
      expect(Object.values(s.enemies).some((e) => e.code === code)).toBe(code === C.magro)
      expect(damage(s)).toEqual([0, 0])
    },
  )

  it('el Centinela impide mirar por el acto, pero no descubrir con la habilidad propia', () => {
    let s = atMasked(game(), C.magro)
    const p = masked(s).find((p) => p.code === `${C.magro}b`)!
    s = during(s, (state) => state, {
      type: 'SpawnEnemy',
      card: enemy({
        code: C.sentinel,
        name: 'Carnevale Sentinel',
        fight: 3,
        health: 3,
        evade: 3,
        damage: 2,
        horror: 0,
        keywords: [],
      }),
      location: getInvestigator(s, 'a').location!,
      engageWith: null,
    })
    s = during(s, (state) => state, specific('carnevaleLook', { placed: p.id, investigator: 'a' }))
    expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
    expect(labels(s)).toContain('ability.carnevale.unmask')
    s = choose(s, 'ability.carnevale.unmask')
    expect(Object.values(s.enemies).some((e) => e.code === C.magro)).toBe(true)
  })

  it('no ofrece descubrir sin pista propia ni a distancia', () => {
    let s = atMasked(game(), C.lagorio, 0)
    expect(labels(s)).not.toContain('ability.carnevale.unmask')
    s = during(s, (state) => ({
      ...state,
      investigators: state.investigators.map((i) => ({ ...i, location: C.basilica, clues: 5 })),
    }))
    expect(labels(s)).not.toContain('ability.carnevale.unmask')
  })

  it('el acto permite mirar a distancia pagando las pistas de varios investigadores', () => {
    let s = game(2)
    const p = masked(s).find((p) => p.code === `${C.lagorio}b`)!
    const location = p.placement.type === 'location' ? p.placement.location : ''
    s = during(s, (state) => ({
      ...state,
      investigators: state.investigators.map((i) => ({ ...i, clues: 1 })),
    }))
    const actions = getInvestigator(s, 'a').actionsRemaining
    s = choose(s, 'ability.carnevale.look')
    expect(getInvestigator(s, 'a').clues).toBe(0)
    expect(getInvestigator(s, 'b').clues).toBe(0)
    s = choose(s, 'choice.location', { location: s.locations[location]!.name })
    expect(labels(s)).toEqual([`choice.carnevale.identity.${C.lagorio}`])
    s = choose(s, `choice.carnevale.identity.${C.lagorio}`)
    expect(getInvestigator(s, 'a').location).toBe(C.basilica)
    expect(getInvestigator(s, 'a').actionsRemaining).toBe(actions - 1)
    expect(s.placedAssets?.[p.id]?.faceDown).toBe(true)
  })

  it('el acto no ofrece mirar sin pistas suficientes ni después del acto 1', () => {
    let s = game(2)
    expect(labels(s)).not.toContain('ability.carnevale.look')
    s = during(s, (state) => ({
      ...state,
      actIndex: 1,
      investigators: state.investigators.map((i) => ({ ...i, clues: 5 })),
    }))
    expect(labels(s)).not.toContain('ability.carnevale.look')
  })
})

describe('Servidores: diferencias de reglas', () => {
  it.each(['fight', 'evade'] as const)(
    'Salvatore usa la habilidad base correcta al calcular la dificultad de %s antes de iniciar la prueba',
    (kind) => {
      let s = unmask(atMasked(game(), C.neri), C.neri)
      s = during(s, (state) => ({
        ...state,
        interactive: true,
        investigators: state.investigators.map((i) => ({
          ...i,
          skills: { ...i.skills, combat: 5, agility: 2 },
        })),
      }))
      expect(s.skillTest).toBeNull()
      s = choose(s, `action.${kind}`, { enemy: 'Salvatore Neri' })
      expect(s.skillTest?.difficulty).toBe(kind === 'fight' ? 5 : 2)
      expect(s.skillTest?.investigator).toBe('a')
    },
  )

  it('Elisabetta gana perdición al terminar Mitos', () => {
    let s = unmask(atMasked(game(), C.magro), C.magro)
    const e = Object.values(s.enemies).find((e) => e.code === C.magro)!
    s = during(s, (state) => state, { type: 'Forced', trigger: { type: 'mythosPhaseEnds' } })
    expect(s.enemies[e.id]?.doom).toBe(1)
  })

  it.each([C.lagorio, C.corvi])(
    '%s usa su conexión adicional al cazar sin dársela al investigador',
    (code) => {
      let s = unmask(atMasked(game(), code), code)
      const e = Object.values(s.enemies).find((e) => e.code === code)!
      const ring = String(s.scenarioMeta?.carnevaleRing).split(',')
      const from = ring.indexOf(e.location)
      const to = ring[(from + (code === C.lagorio ? 7 : 4)) % 8]!
      s = during(
        s,
        (state) => ({
          ...state,
          enemies: { ...state.enemies, [e.id]: { ...state.enemies[e.id]!, engagedWith: null } },
          investigators: state.investigators.map((i) => ({ ...i, location: to })),
        }),
        { type: 'HuntersMove', enemies: [e.id] },
      )
      expect(s.enemies[e.id]?.location).toBe(to)
      expect(s.locations[e.location]?.connections).toEqual([ring[(from + 1) % 8]])
    },
  )
})

describe('Carnavaleros inocentes (carta 21)', () => {
  function innocent(players = 1) {
    return unmask(atMasked(game(players), C.innocent), C.innocent)
  }
  function parley(s: GameState, token = 0) {
    s = during(s, withBag(token))
    return choose(s, 'ability.carnevale.parley')
  }
  it('descubrir al inocente conserva la instancia; negociar tiene prueba de intelecto 2 y no provoca', () => {
    let s = atMasked(game(), C.innocent)
    const p = masked(s).find((p) => p.code === `${C.innocent}b`)!
    s = choose(s, 'ability.carnevale.unmask')
    expect(s.placedAssets?.[p.id]?.code).toBe(C.innocent)
    expect(labels(s)).toContain('ability.carnevale.parley')
    s = parley(s)
    const a = Object.values(s.assets).find((a) => a.code === C.innocent)!
    expect(a.owner).toBe('a')
    expect(a.noSlot).toBe(true)
    expect(s.placedAssets?.[p.id]).toBeUndefined()
  })
  it('fallar la negociación deja al inocente en su Lugar', () => {
    const s = parley(innocent(), -6)
    expect(Object.values(s.assets)).toHaveLength(0)
    expect(Object.values(s.placedAssets ?? {}).filter((p) => p.code === C.innocent)).toHaveLength(1)
  })

  it('negociar conserva el daño y horror del inocente y no provoca ataques de oportunidad', () => {
    let s = innocent()
    const p = Object.values(s.placedAssets ?? {}).find((p) => p.code === C.innocent)!
    s = during(
      s,
      (state) => state,
      { type: 'DamagePlacedAsset', placed: p.id, damage: 1, horror: 1 },
      {
        type: 'SpawnEnemy',
        card: enemy({
          code: 'carnevale-test-guard',
          name: 'Guard',
          fight: 3,
          health: 3,
          evade: 3,
          damage: 2,
          horror: 0,
          keywords: [],
        }),
        location: getInvestigator(s, 'a').location!,
        engageWith: 'a',
      },
    )
    s = parley(s)
    const a = Object.values(s.assets).find((a) => a.code === C.innocent)!
    expect([a.damage, a.horror]).toEqual([1, 1])
    expect(damage(s)).toEqual([0, 0])
  })

  it('el mismo inocente no puede contarse dos veces bajo un mazo', () => {
    let s = innocent()
    const p = Object.values(s.placedAssets ?? {}).find((p) => p.code === C.innocent)!
    s = during(
      s,
      (state) => state,
      specific('carnevaleInnocentLeaves', { placed: p.id }),
      specific('carnevaleInnocentLeaves', { placed: p.id }),
    )
    expect(sacrificed(s)).toEqual([C.innocent])
    expect(damage(s)).toEqual([0, 1])
  })
  it('rescatarlos exige llevarlos a la Basílica y gastar una acción, sin descartarlos ni sufrir horror', () => {
    let s = parley(innocent())
    expect(labels(s)).not.toContain('ability.carnevale.rescue')
    s = during(s, (state) => ({
      ...state,
      investigators: state.investigators.map((i) => ({
        ...i,
        location: C.basilica,
        actionsRemaining: 3,
      })),
    }))
    s = choose(s, 'ability.carnevale.rescue')
    expect(rescued(s)).toEqual([C.innocent])
    expect(sacrificed(s)).toEqual([])
    expect(Object.values(s.assets)).toHaveLength(0)
    expect(getInvestigator(s, 'a').discard).not.toContain(C.innocent)
    expect(damage(s)).toEqual([0, 0])
    expect(getInvestigator(s, 'a').actionsRemaining).toBe(2)
  })
  it.each(['damage', 'horror'] as const)(
    'si un inocente sin dueño es derrotado por %s se sacrifica y todos sufren horror',
    (stat) => {
      let s = innocent(2)
      const p = Object.values(s.placedAssets ?? {}).find((p) => p.code === C.innocent)!
      s = during(s, (state) => state, {
        type: 'DamagePlacedAsset',
        placed: p.id,
        damage: stat === 'damage' ? 2 : 0,
        horror: stat === 'horror' ? 2 : 0,
      })
      expect(s.placedAssets?.[p.id]).toBeUndefined()
      expect(sacrificed(s)).toEqual([C.innocent])
      expect(rescued(s)).toEqual([])
      expect(damage(s)).toEqual([0, 1])
      expect(damage(s, 'b')).toEqual([0, 1])
    },
  )
  it.each(['discard', 'damage', 'return', 'eliminate'] as const)(
    'la salida por %s de un inocente controlado se sustituye por sacrificio una sola vez',
    (reason) => {
      let s = parley(innocent(2))
      const a = Object.values(s.assets).find((a) => a.code === C.innocent)!
      const msg: Message =
        reason === 'discard'
          ? { type: 'DiscardAsset', asset: a.id }
          : reason === 'damage'
            ? { type: 'DamageAsset', asset: a.id, damage: 2, horror: 0 }
            : reason === 'return'
              ? { type: 'ReturnAssetToHand', asset: a.id }
              : { type: 'EliminateInvestigator', investigator: 'a' }
      s = during(s, (state) => state, msg)
      expect(s.assets[a.id]).toBeUndefined()
      expect(sacrificed(s)).toEqual([C.innocent])
      expect(getInvestigator(s, 'b').horror).toBe(1)
      expect(getInvestigator(s, 'a').hand).not.toContain(C.innocent)
      expect(getInvestigator(s, 'a').discard).not.toContain(C.innocent)
    },
  )
})
