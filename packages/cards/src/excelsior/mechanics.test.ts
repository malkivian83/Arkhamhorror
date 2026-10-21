import { dispatch, getInvestigator, type GameState, type Message } from '@lcg/engine'
import { choose, during, labels, withBag } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { starterInvestigator } from '../core-2026/player-cards'
import '../index'
import { CODES, arkhamOfficer, hotelGuest, otherworldlyMeddler, vengefulSpecter } from './cards'
import { actions, atFollowingLeads, newGame, settle, theTruth } from './testing'

const [DANIELA, JOE] = (['daniela', 'joe'] as const).map((k) => starterInvestigator(k).id) as [
  string,
  string,
]

const spawn = (card: typeof hotelGuest, location: string): Message => ({
  type: 'SpawnEnemy',
  card,
  location,
  engageWith: null,
})
const enemy = (g: GameState, code: string) => Object.values(g.enemies).find((e) => e.code === code)
const skills = (n: number) => (s: GameState) => ({
  ...s,
  investigators: s.investigators.map((i) => ({
    ...i,
    skills: { willpower: n, intellect: n, combat: n, agility: n },
  })),
})

describe('Vestíbulo', () => {
  it('salir con Clientes aquí exige una prueba de [agility]; si fallas, 1 acción más', () => {
    let game = actions(newGame(2))
    // Turno de Daniela (Habitación 225): pasa el turno a Joe, que está en el Vestíbulo.
    game = settle(choose(game, 'action.endTurn'))
    expect(game.pending?.investigator).toBe(JOE)
    game = during(game, (s) => skills(0)(withBag(-1)(s)), spawn(hotelGuest, CODES.foyer))
    const before = getInvestigator(game, JOE).actionsRemaining
    game = settle(choose(game, 'action.move', { location: 'Second Floor Hall' }))
    // Ha fallado: gasta otra acción y se mueve igualmente.
    expect(getInvestigator(game, JOE).location).toBe(CODES.secondFloorHall)
    expect(getInvestigator(game, JOE).actionsRemaining).toBe(before - 2)
  })
})

describe('¿Qué has hecho?', () => {
  it('negociar cuesta descartar una carta al azar; sin cartas no se puede', () => {
    let game = actions(newGame(2))
    game = during(
      game,
      (s) => skills(5)(withBag(0)(s)),
      { type: 'ResolveWeakness', investigator: DANIELA, code: CODES.whatHaveYouDone },
      spawn(hotelGuest, CODES.room225),
    )
    game = settle(game)
    const hand = getInvestigator(game, DANIELA).hand.length
    expect(labels(game)).toContain('ability.excelsior.parley')
    game = settle(choose(game, 'ability.excelsior.parley', { skill: 'willpower' }))
    expect(getInvestigator(game, DANIELA).hand.length).toBe(hand - 1)
    expect(enemy(game, CODES.hotelGuest)).toBeUndefined()
    game = during(
      game,
      (s) => ({
        ...s,
        investigators: s.investigators.map((i) => (i.id === DANIELA ? { ...i, hand: [] } : i)),
      }),
      spawn(hotelGuest, CODES.room225),
    )
    expect(labels(game)).not.toContain('ability.excelsior.parley')
    // [acción]: barajarla en tu mazo.
    game = settle(choose(game, 'ability.excelsior.shuffleWeakness'))
    expect(Object.values(game.treacheries).some((t) => t.code === CODES.whatHaveYouDone)).toBe(
      false,
    )
    expect(getInvestigator(game, DANIELA).deck).toContain(CODES.whatHaveYouDone)
  })
})

describe('Llevado a la locura', () => {
  it('se vincula al Humanoide más cercano y pierde Indiferente; al evitarlo, se descarta', () => {
    let game = actions(newGame(2))
    game = during(game, (s) => s, spawn(hotelGuest, CODES.room225))
    const guest = enemy(game, CODES.hotelGuest)!
    game = settle(
      during(game, (s) => s, {
        type: 'ResolveEncounterCard',
        investigator: DANIELA,
        card: {
          kind: 'treachery',
          code: CODES.drivenToMadness,
          name: 'Driven to Madness',
          traits: ['Curse'],
          keywords: [],
        },
      }),
    )
    const madness = Object.values(game.treacheries).find((t) => t.code === CODES.drivenToMadness)
    expect(madness?.placement).toEqual({ type: 'enemy', enemy: guest.id })
    // Ya no es Indiferente: se ha enfrentado a Daniela; ya no se puede negociar con él.
    expect(game.enemies[guest.id]?.engagedWith).toBe(DANIELA)
    expect(labels(game)).not.toContain('ability.excelsior.parley')
    // Al ser evitado, se descarta.
    game = settle(during(game, (s) => s, { type: 'EvadeEnemy', enemy: guest.id, by: DANIELA }))
    expect(Object.values(game.treacheries).some((t) => t.code === CODES.drivenToMadness)).toBe(
      false,
    )
  })
})

describe('Plan 2: Investigación especial', () => {
  it('descubrir pistas con un Policía preparado aquí provoca su ataque', () => {
    let game = actions(newGame(2))
    game = during(game, (s) => ({ ...s, agendaIndex: 1 }), spawn(arkhamOfficer, CODES.room225))
    const damage = getInvestigator(game, DANIELA).damage
    game = settle(
      during(game, (s) => s, { type: 'DiscoverClues', investigator: DANIELA, amount: 1 }),
    )
    // Daniela recibe el daño del Agente (puede asignarlo a apoyos: lo pasamos a ella).
    while (game.pending?.question.prompt === 'prompt.assignDamage')
      game = settle(choose(game, 'choice.assignToInvestigator'))
    const officer = enemy(game, CODES.arkhamOfficer)!
    expect(officer.engagedWith).toBe(DANIELA)
    expect(getInvestigator(game, DANIELA).damage).toBe(damage + 1)
  })
})

describe('Sargento Monroe', () => {
  it('sin dueño en el Vestíbulo recibe el daño y su reacción daña a un enemigo no Inocente', () => {
    let game = actions(newGame(2))
    game = settle(choose(game, 'action.endTurn'))
    game = during(
      game,
      (s) => s,
      {
        type: 'PlaceAsset',
        code: CODES.sergeantMonroe,
        name: 'Sergeant Monroe',
        placement: { type: 'location', location: CODES.foyer },
      },
      spawn({ ...vengefulSpecter, keywords: [] }, CODES.foyer),
    )
    game = dispatch(
      { ...game, pending: null },
      { type: 'TakeDamage', investigator: JOE, damage: 2, horror: 0 },
    )
    game = choose(game, 'choice.assignToAsset', { card: 'Sergeant Monroe' })
    game = choose(game, 'choice.assignToAsset', { card: 'Sergeant Monroe' })
    expect(labels(game)).toContain('ability.excelsior.monroe')
    game = settle(choose(game, 'ability.excelsior.monroe', { n: 2 }))
    // El Espectro vengativo reduce a 1 el daño que no sea de Hechizos, Reliquias o Encuentros.
    expect(enemy(game, CODES.vengefulSpecter)?.damageTaken).toBe(1)
    const monroe = Object.values(game.placedAssets ?? {}).find(
      (p) => p.code === CODES.sergeantMonroe,
    )
    expect(monroe?.damage).toBe(2)
    expect(monroe?.exhausted).toBe(true)
  })
})

describe('Entrometido sobrenatural', () => {
  it('el daño de un ataque retira 1 perdición y se reduce en 1', () => {
    let game = actions(newGame(2))
    game = during(game, (s) => s, spawn(otherworldlyMeddler, CODES.room225))
    const meddler = enemy(game, CODES.otherworldlyMeddler)!
    game = during(game, (s) => s, { type: 'PlaceDoomOnEnemy', enemy: meddler.id, amount: 2 })
    game = settle(
      during(game, (s) => s, {
        type: 'DamageEnemy',
        enemy: meddler.id,
        amount: 3,
        by: DANIELA,
        source: { attack: true },
      }),
    )
    expect(game.enemies[meddler.id]?.damageTaken).toBe(2)
    expect(game.enemies[meddler.id]?.doom).toBe(1)
  })
})

describe('Tarjeta de referencia', () => {
  it('[cultist] revela otra ficha si hay un Inocente en la zona de victoria', () => {
    let game = actions(newGame(2))
    game = during(game, (s) => ({
      ...withBag('cultist', 0)(s),
      victoryDisplay: [CODES.hotelGuest],
    }))
    game = settle(choose(game, 'ability.excelsior.cleanedUpTheBlood'))
    const test = game.log.findLast((l) => l.key.startsWith('log.test'))
    expect(String(test?.params?.tokens).split(' ')).toHaveLength(2)
  })

  it('[skull] cuenta los Clientes en juego (normal)', () => {
    let game = actions(newGame(2))
    game = during(game, (s) => skills(3)(withBag('skull')(s)), spawn(hotelGuest, CODES.foyer))
    game = settle(choose(game, 'ability.excelsior.cleanedUpTheBlood'))
    expect(game.log.findLast((l) => l.key.startsWith('log.test'))?.params?.value).toBe(2)
  })
})

describe('Final', () => {
  it('v. X: retirar toda la perdición del plan cumple el objetivo (R1)', () => {
    let game = theTruth(atFollowingLeads(newGame(2), [CODES.managersKey, CODES.tomeOfRituals], 4))
    game = settle(
      during(game, (s) => s, { type: 'RemoveDoom', target: { type: 'agenda' }, amount: 10 }),
    )
    expect(game.outcome).toEqual({ type: 'resolution', resolution: 1 })
  })
})
