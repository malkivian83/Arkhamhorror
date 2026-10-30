import {
  availableAbilities,
  availableActions,
  enemiesAt,
  getInvestigator,
  playerCardDef,
} from '@lcg/engine'
import { choose, during, labels, withBag } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import '../index'
import { C } from './codes'
import { specific, sacrificed } from './helpers'
import { boss, emit, game, settle } from './testing'
import { appendage, poleman, sentinel, TREACHERIES } from './data'
import { masked, rescued } from './helpers'
import { ring } from './topology'

const selectFlip = (s: ReturnType<typeof game>, code: string) => {
  const p = masked(s).find((p) => p.code === `${code}b`)!
  const l = p.placement.type === 'location' ? p.placement.location : ''
  return choose(s, 'choice.location', { location: s.locations[l]!.name })
}

// RR "Damage/Horror", assign both kinds before checking asset defeat.
it('Cnidathqua asigna los 2 daños y 2 horrores al mismo inocente antes de sacrificarlo', () => {
  let s = emit(game(), specific('carnevaleBoss'), {
    type: 'PutAssetIntoPlay',
    code: C.innocent,
    investigator: 'a',
    noSlot: true,
  })
  s = settle(
    emit(s, { type: 'EnemyAttack', enemy: boss(s).id, investigator: 'a', exhaustAfter: false }),
  )
  expect(getInvestigator(s, 'a').damage).toBe(0)
  expect(getInvestigator(s, 'a').horror).toBe(1)
  expect(sacrificed(s)).toEqual([C.innocent])
})

describe('Actos, planes y Cnidathqua (cartas 2–7 y 27)', () => {
  it('la preparación contiene 26 encuentros y aparta el jefe y el Carnavalero', () => {
    const s = game()
    expect(s.encounterDeck).toHaveLength(26)
    expect(s.encounterDeck.filter((c) => c.code === C.appendage)).toHaveLength(3)
    expect(s.encounterDeck.filter((c) => c.code === C.sentinel)).toHaveLength(3)
    expect(s.setAside.map((c) => c.code).sort()).toEqual([C.cnidathqua, C.reveler].sort())
  })
  it('el acto 1 suma rescates y sacrificios, aparece al jefe una sola vez y descubre otro enmascarado', () => {
    let s = game(2)
    s = during(
      s,
      (state) => ({
        ...state,
        scenarioDecks: {
          ...state.scenarioDecks,
          carnevaleRescued: [C.innocent, C.innocent],
          carnevaleSacrificed: [C.innocent],
        },
        placedAssets: Object.fromEntries(
          Object.entries(state.placedAssets ?? {}).filter(([, p]) => p.code !== `${C.innocent}b`),
        ),
      }),
      { type: 'CheckActObjective' },
    )
    expect(boss(s)?.global).toBe(true)
    expect(boss(s)?.location).toBe('')
    expect(boss(s)?.maxHealth).toBe(16)
    s = selectFlip(s, C.magro)
    expect(s.actIndex).toBe(1)
    expect(masked(s)).toHaveLength(3)
    s = emit(s, specific('carnevaleBoss'))
    expect(Object.values(s.enemies).filter((e) => e.code === C.cnidathqua)).toHaveLength(1)
  })
  it('con dos inocentes bajo los mazos aún no avanza el acto 1', () => {
    const s = during(
      game(),
      (state) => ({
        ...state,
        scenarioDecks: { carnevaleRescued: [C.innocent], carnevaleSacrificed: [C.innocent] },
      }),
      { type: 'CheckActObjective' },
    )
    expect(s.actIndex).toBe(0)
    expect(boss(s)).toBeUndefined()
  })
  it('el plan 1 aparece al Carnavalero en el Lugar vacío más cercano en sentido antihorario desde el jefe', () => {
    let s = game(2)
    const order = ring(s)
    s = during(
      s,
      (state) => ({
        ...state,
        leadInvestigatorId: 'b',
        investigators: state.investigators.map((i) => ({
          ...i,
          location: i.id === 'b' ? order[0]! : order[7]!,
        })),
      }),
      { type: 'AdvanceAgenda' },
    )
    const e = Object.values(s.enemies).find((e) => e.code === C.reveler)!
    expect(e.location).toBe(order[6])
    expect(e.maxHealth).toBe(10)
    expect(s.agendaIndex).toBe(1)
  })
  it('el plan 2 coloca al inocente bajo el plan sin descartarlo ni causar horror, y se repite', () => {
    let s = during(game(2), (state) => ({ ...state, agendaIndex: 1, doom: 3 }), {
      type: 'AdvanceAgenda',
    })
    s = selectFlip(s, C.innocent)
    expect(s.agendaIndex).toBe(1)
    expect(s.doom).toBe(0)
    expect(sacrificed(s)).toEqual([C.innocent])
    expect(rescued(s)).toEqual([])
    expect(s.investigators.map((i) => i.horror)).toEqual([0, 0])
    expect(masked(s)).toHaveLength(6)
  })
  it.each([true, false])(
    'el plan 2 avanza al 3 cuando no quedan enmascarados (último presente: %s)',
    (last) => {
      let s = game()
      const p = masked(s).find((p) => p.code === `${C.magro}b`)!
      s = during(
        s,
        (state) => ({ ...state, agendaIndex: 1, placedAssets: last ? { [p.id]: p } : {} }),
        { type: 'AdvanceAgenda' },
      )
      if (last && s.pending?.question.prompt === 'prompt.carnevale.chooseFlip')
        s = selectFlip(s, C.magro)
      expect(s.agendaIndex).toBe(2)
      expect(s.doom).toBe(0)
    },
  )
  it('el acto 2 descubre un enmascarado al comenzar Mitos, antes de colocar perdición', () => {
    const s = during(game(), (state) => ({ ...state, actIndex: 1, agendaIndex: 1, doom: 2 }), {
      type: 'MythosPhase',
    })
    expect(s.pending?.question.prompt).toBe('prompt.carnevale.chooseFlip')
    expect(s.doom).toBe(2)
  })
  it('el plan 3 coloca 2 perdiciones en cada apéndice sin adelantar la comprobación del umbral', () => {
    let s = during(game(), (state) => ({ ...state, agendaIndex: 2 }))
    s = emit(
      s,
      { type: 'SpawnEnemy', card: appendage, location: C.canal, engageWith: null },
      { type: 'SpawnEnemy', card: appendage, location: C.canal, engageWith: null },
    )
    expect(Object.values(s.enemies).map((e) => e.doom)).toEqual([2, 2])
    expect(s.log.filter((e) => e.key === 'log.agendaAdvanced')).toHaveLength(0)
  })
  it('el plan 3 ataca en orden desde el jefe, retira toda la perdición y se repite', () => {
    let s = emit(game(2), specific('carnevaleBoss'))
    s = during(s, (state) => ({ ...state, agendaIndex: 2, doom: 3, leadInvestigatorId: 'b' }), {
      type: 'AdvanceAgenda',
    })
    expect(s.agendaIndex).toBe(2)
    expect(s.doom).toBe(0)
    expect(s.enemyAttacks?.map((a) => a.investigator)).toEqual(['b', 'a'])
    expect(s.investigators.map((i) => [i.damage, i.horror])).toEqual([
      [2, 2],
      [2, 2],
    ])
    s = emit(s, { type: 'AdvanceAgenda' })
    expect(s.investigators.map((i) => [i.damage, i.horror])).toEqual([
      [4, 4],
      [4, 4],
    ])
  })
  it('la Góndola mueve a todos antes de retirar la ciudad: conserva los enemigos enfrentados y a Cnidathqua', () => {
    let s = emit(
      game(2),
      specific('carnevaleBoss'),
      { type: 'SpawnEnemy', card: appendage, location: C.basilica, engageWith: 'a' },
      { type: 'SpawnEnemy', card: sentinel, location: C.canal, engageWith: null },
    )
    const carried = Object.values(s.enemies).find((e) => e.code === C.appendage)!
    s = during(
      s,
      (state) => ({
        ...state,
        actIndex: 1,
        investigators: state.investigators.map((i) => ({ ...i, location: C.canal })),
      }),
      { type: 'CheckActObjective' },
    )
    expect(Object.keys(s.locations)).toEqual([C.gondola])
    expect(s.investigators.map((i) => i.location)).toEqual([C.gondola, C.gondola])
    expect(s.enemies[carried.id]?.location).toBe(C.gondola)
    expect(boss(s)?.location).toBe('')
    expect(Object.values(s.enemies).some((e) => e.code === C.sentinel)).toBe(false)
    expect(Object.values(s.placedAssets ?? {})).toHaveLength(0)
    expect(s.actIndex).toBe(2)
  })
  it('el acto 2 no avanza mientras un investigador no derrotado esté fuera del Canal', () => {
    const s = during(
      game(2),
      (state) => ({
        ...state,
        actIndex: 1,
        investigators: state.investigators.map((i, n) => ({
          ...i,
          location: n ? C.canal : C.basilica,
        })),
      }),
      { type: 'CheckActObjective' },
    )
    expect(s.actIndex).toBe(1)
    expect(s.locations[C.gondola]).toBeUndefined()
  })
  it('el jefe no ocupa ningún Lugar, solo se puede combatir con él y no puede moverse ni enfrentarse', () => {
    let s = emit(game(), specific('carnevaleBoss'))
    const e = boss(s)
    expect(enemiesAt(s, C.basilica)).toHaveLength(0)
    expect(availableActions(s, 'a').some((a) => a.kind === 'fight' && a.enemy === e.id)).toBe(true)
    expect(
      availableActions(s, 'a').some(
        (a) => (a.kind === 'engage' || a.kind === 'evade') && a.enemy === e.id,
      ),
    ).toBe(false)
    s = emit(
      s,
      { type: 'MoveEnemy', enemy: e.id, location: C.canal },
      { type: 'EngageEnemy', enemy: e.id, investigator: 'a' },
      { type: 'EvadeEnemy', enemy: e.id, by: 'a' },
    )
    expect(boss(s).location).toBe('')
    expect(boss(s).engagedWith).toBeNull()
  })
  it.each(['01074', '01060'])(
    'un arma o hechizo (%s) puede combatir con el jefe remoto',
    (code) => {
      let s = emit(game(), specific('carnevaleBoss'), {
        type: 'PutAssetIntoPlay',
        code,
        investigator: 'a',
      })
      s = during(s, (state) => ({
        ...withBag(0)(state),
        investigators: state.investigators.map((i) => ({
          ...i,
          skills: { willpower: 6, combat: 6, agility: 3, intellect: 3 },
        })),
      }))
      const a = availableAbilities(s, 'a').find(
        (a) =>
          a.target?.type === 'enemy' &&
          a.target.id === boss(s).id &&
          a.key.startsWith(Object.values(s.assets).find((a) => a.code === code)!.id),
      )!
      expect(a).toBeDefined()
      s = settle(choose(s, a.label, a.params))
      expect(boss(s).damageTaken).toBe(2)
      expect(boss(s).engagedWith).toBeNull()
    },
  )
  it('Navaja espectral ataca a Cnidathqua sin ofrecer enfrentarlo primero', () => {
    let s = emit(game(), specific('carnevaleBoss'))
    s = during(s, (state) => ({
      ...withBag(0)(state),
      investigators: state.investigators.map((i) => ({ ...i, hand: ['06201'] })),
    }))
    s = settle(choose(s, 'action.play', { card: playerCardDef('06201')!.name }))
    expect(boss(s).damageTaken).toBe(2)
    expect(boss(s).engagedWith).toBeNull()
  })
  it('fallar un ataque busca un apéndice; permite elegir del descarte y no duplica cartas', () => {
    let s = emit(game(), specific('carnevaleBoss'))
    s = during(s, (state) => ({
      ...withBag('autoFail')(state),
      encounterDeck: [appendage],
      encounterDiscard: [appendage],
    }))
    s = settle(choose(s, 'action.fight', { enemy: 'Cnidathqua' }))
    expect(labels(s)).toEqual(['choice.carnevale.searchDeck', 'choice.carnevale.searchDiscard'])
    s = choose(s, 'choice.carnevale.searchDiscard')
    expect(s.encounterDeck).toHaveLength(1)
    expect(s.encounterDiscard).toHaveLength(0)
    expect(Object.values(s.enemies).filter((e) => e.code === C.appendage)).toHaveLength(1)
    expect(Object.values(s.enemies).find((e) => e.code === C.appendage)?.engagedWith).toBe('a')
  })
  it('derrotar un apéndice daña al jefe sin atribuir ese daño al investigador y puede alcanzar R2', () => {
    let s = emit(game(), specific('carnevaleBoss'), {
      type: 'SpawnEnemy',
      card: appendage,
      location: C.basilica,
      engageWith: 'a',
    })
    const app = Object.values(s.enemies).find((e) => e.code === C.appendage)!
    s = during(
      s,
      (state) => ({
        ...state,
        enemies: { ...state.enemies, [boss(state).id]: { ...boss(state), damageTaken: 7 } },
      }),
      { type: 'DamageEnemy', enemy: app.id, amount: 2, by: 'a' },
    )
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 2 })
    expect(s.victoryDisplay).toContain(C.cnidathqua)
    expect(s.defeatedEnemyHealthThisTurn?.a).toBe(2)
  })
})

describe('¡Remad! y la Góndola', () => {
  function aboard(players = 1) {
    return during(
      game(players),
      (state) => ({
        ...state,
        actIndex: 1,
        investigators: state.investigators.map((i) => ({ ...i, location: C.canal })),
      }),
      { type: 'CheckActObjective' },
    )
  }
  it('sustituye el robo por mirar cinco: aparece todos los apéndices enfrentados y descarta el resto sin revelarlo', () => {
    let s = aboard()
    s = during(
      s,
      (state) => ({
        ...state,
        agendaIndex: 2,
        encounterDeck: [appendage, TREACHERIES[0]!, appendage, poleman, TREACHERIES[1]!, sentinel],
        encounterDiscard: [],
      }),
      { type: 'DrawEncounterCard', investigator: 'a' },
    )
    expect(s.encounterDeck.map((c) => c.code)).toEqual([C.sentinel])
    expect(s.encounterDiscard.map((c) => c.code)).toEqual([C.hysteria, C.poleman, C.lost])
    expect(Object.values(s.enemies).map((e) => [e.code, e.engagedWith, e.doom])).toEqual([
      [C.appendage, 'a', 2],
      [C.appendage, 'a', 2],
    ])
    expect(getInvestigator(s, 'a').damage).toBe(0)
    expect(s.treacheries).toEqual({})
  })
  it('con menos de cinco cartas mira las disponibles y no vuelve a mirar las que acaba de descartar', () => {
    let s = aboard()
    s = during(
      s,
      (state) => ({
        ...state,
        encounterDeck: [appendage, TREACHERIES[0]!],
        encounterDiscard: [TREACHERIES[1]!],
      }),
      { type: 'DrawEncounterCard', investigator: 'a' },
    )
    expect(s.encounterDeck).toHaveLength(0)
    expect(s.encounterDiscard).toHaveLength(2)
    expect(Object.values(s.enemies)).toHaveLength(1)
  })
  it('si el mazo estaba vacío, baraja el descarte antes de mirar', () => {
    let s = aboard()
    s = during(
      s,
      (state) => ({ ...state, encounterDeck: [], encounterDiscard: [appendage, TREACHERIES[0]!] }),
      { type: 'DrawEncounterCard', investigator: 'a' },
    )
    expect(Object.values(s.enemies)).toHaveLength(1)
    expect(s.encounterDiscard.map((c) => c.code)).toEqual([C.hysteria])
  })
  it.each(['combat', 'agility'])(
    'remar prueba %s 2 y coloca recursos en el Lugar, sin gastarlos del investigador',
    (skill) => {
      let s = aboard(2)
      s = during(s, withBag(0))
      const before = getInvestigator(s, 'a').resources
      s = choose(s, 'ability.carnevale.row')
      s = settle(choose(s, `choice.test.${skill}`))
      expect(s.locations[C.gondola]?.resources).toBe(1)
      expect(getInvestigator(s, 'a').resources).toBe(before)
    },
  )
  it('el objetivo exige 4 recursos por investigador y acaba en R1', () => {
    let s = aboard(2)
    s = during(
      s,
      (state) => ({
        ...state,
        locations: {
          ...state.locations,
          [C.gondola]: { ...state.locations[C.gondola]!, resources: 7 },
        },
      }),
      { type: 'CheckActObjective' },
    )
    expect(s.outcome).toBeNull()
    s = emit(s, specific('carnevaleRowed'))
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 1 })
  })
})
