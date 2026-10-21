import { getInvestigator, type GameState, type Message } from '@lcg/engine'
import { choose, during, labels, withBag } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { CODES, LEADS, LOCATIONS } from './cards'
import { CHAOS_BAGS } from './excelsior'
import { actions, atFollowingLeads, ids, newGame, settle, theTruth } from './testing'

const [DANIELA, JOE, TRISH] = ids as [string, string, string]

const assetOf = (game: GameState, code: string) =>
  Object.values(game.assets).find((a) => a.code === code)

describe('Asesinato en el hotel Excelsior: preparación', () => {
  it('coloca a los investigadores, la Daga y el mazo de Indicios', () => {
    const game = actions(newGame(3))
    expect(getInvestigator(game, DANIELA).location).toBe(CODES.room225)
    expect(getInvestigator(game, JOE).location).toBe(CODES.foyer)
    expect(getInvestigator(game, TRISH).location).toBe(CODES.foyer)
    expect(assetOf(game, CODES.bloodstainedDagger)?.owner).toBe(DANIELA)
    expect([...(game.scenarioDecks?.leads ?? [])].sort()).toEqual([...LEADS].sort())
    expect(Object.keys(game.locations).sort()).toEqual(
      [
        CODES.room225,
        CODES.suiteBalcony,
        CODES.secondFloorHall,
        CODES.restaurant,
        CODES.foyer,
      ].sort(),
    )
    expect(Object.keys(game.setAsideLocations)).toHaveLength(5)
    expect(game.encounterDeck).toHaveLength(22)
    // 3 Agentes de Arkham, 15 cartas de Indicios, 4 Élites y el Cerebro extraído.
    expect(game.setAside).toHaveLength(23)
    expect(game.agendas.map((a) => a.doomThreshold)).toEqual([3, 12])
    expect(game.locations[CODES.room225]?.revealed).toBe(true)
    expect(game.locations[CODES.foyer]?.revealed).toBe(true)
  })

  it('con 1 investigador el plan 1 tiene +1 al umbral y solo hay dos bolsas', () => {
    expect(newGame(1).agendas[0]?.doomThreshold).toBe(4)
    expect(CHAOS_BAGS.easy).toEqual(CHAOS_BAGS.standard)
    expect(CHAOS_BAGS.expert).toEqual(CHAOS_BAGS.hard)
    expect(CHAOS_BAGS.standard).toHaveLength(15)
  })

  it('cada localización tiene posición y conexiones por símbolo', () => {
    for (const l of Object.values(LOCATIONS)) expect(l.position).toBeDefined()
    const game = newGame(2)
    expect(game.locations[CODES.secondFloorHall]?.connections.sort()).toEqual(
      [CODES.room225, CODES.foyer, CODES.restaurant].sort(),
    )
  })
})

describe('Acto 1: ¿Qué ha pasado…?', () => {
  it('robar Indicios cuesta 1 pista por investigador y con 2 avanza el acto', () => {
    let game = actions(newGame(2))
    game = during(game, (s) => ({
      ...s,
      investigators: s.investigators.map((i) => ({ ...i, clues: 4 })),
    }))
    expect(labels(game)).toContain('ability.excelsior.drawLead')
    game = choose(game, 'ability.excelsior.drawLead')
    if (game.pending?.question.prompt === 'prompt.whoPaysClue')
      while (game.pending?.question.prompt === 'prompt.whoPaysClue')
        game = choose(game, 'choice.investigatorPaysClue', {
          name: getInvestigator(game, DANIELA).name,
        })
    const first = game.scenarioDecks?.leads
    expect(first).toHaveLength(4)
    expect(Object.values(game.assets).filter((a) => LEADS.includes(a.code as never))).toHaveLength(
      1,
    )
    game = choose(game, 'ability.excelsior.drawLead')
    while (game.pending?.question.prompt === 'prompt.whoPaysClue')
      game = choose(game, 'choice.investigatorPaysClue', { name: getInvestigator(game, JOE).name })
    // El acto avanza: lugares apartados en juego, mazo de Indicios retirado y 6 encuentros.
    expect(game.actIndex).toBe(1)
    expect(Object.keys(game.locations)).toHaveLength(10)
    expect(game.scenarioDecks?.leads).toEqual([])
    expect(game.encounterDeck.length + game.encounterDiscard.length).toBe(22 + 6)
    expect(game.setAside).toHaveLength(23 - 6)
  })
})

describe('Plan 1: El asesinato', () => {
  it('Monroe en el Vestíbulo, Agente en el Pasillo, ¿Qué has hecho? y sospechas', () => {
    let game = actions(newGame(3))
    game = during(
      game,
      (s) => ({ ...s, doom: 2 }),
      { type: 'PlaceDoom', amount: 1 },
      {
        type: 'CheckAgenda',
      },
    )
    game = settle(game)
    expect(game.agendaIndex).toBe(1)
    const monroe = Object.values(game.placedAssets ?? {}).find(
      (p) => p.code === CODES.sergeantMonroe,
    )
    expect(monroe?.placement).toEqual({ type: 'location', location: CODES.foyer })
    const officers = Object.values(game.enemies).filter((e) => e.code === CODES.arkhamOfficer)
    // 3 investigadores: uno en el Pasillo y otro en el Vestíbulo.
    expect(officers.map((o) => o.location).sort()).toEqual(
      [CODES.secondFloorHall, CODES.foyer].sort(),
    )
    expect(game.setAside.filter((c) => c.code === CODES.arkhamOfficer)).toHaveLength(0)
    const whyd = Object.values(game.treacheries).find((t) => t.code === CODES.whatHaveYouDone)
    expect(whyd?.placement).toEqual({ type: 'threatArea', investigator: DANIELA })
    // Nada encubierto: 3 pistas en la Habitación 225 y 3 perdiciones en los Agentes.
    expect(game.locations[CODES.room225]?.clues).toBe(3 + 3)
    expect(officers.reduce((n, o) => n + (game.enemies[o.id]?.doom ?? 0), 0)).toBe(3)
  })

  it('lo encubierto en la Habitación 225 no da sospechas', () => {
    let game = actions(newGame(2))
    game = during(
      game,
      (s) => ({
        ...s,
        doom: 2,
        scenarioMeta: { cleanedUpTheBlood: 1, hidTheBody: 1 },
      }),
      { type: 'PlaceDoom', amount: 1 },
      { type: 'CheckAgenda' },
    )
    const officer = Object.values(game.enemies).find((e) => e.code === CODES.arkhamOfficer)
    expect(officer?.doom).toBe(1)
    expect(game.locations[CODES.room225]?.clues).toBe(2 + 1)
  })
})

describe('Habitación 225 y movimiento', () => {
  it('las tres acciones de encubrir recuerdan lo hecho', () => {
    let game = actions(newGame(2))
    game = during(game, withBag(0))
    game = settle(choose(game, 'ability.excelsior.cleanedUpTheBlood'))
    expect(game.scenarioMeta?.cleanedUpTheBlood).toBe(1)
    expect(labels(game)).not.toContain('ability.excelsior.cleanedUpTheBlood')
  })

  it('no se entra en la Habitación 212 desde el Pasillo; se fuerza la cerradura', () => {
    let game = actions(newGame(1))
    game = during(
      game,
      (s) => ({
        ...withBag(0)(s),
        investigators: s.investigators.map((i) => ({ ...i, skills: { ...i.skills, agility: 5 } })),
      }),
      ...(['84015', '84016', '84017', '84018', '84019'].map((l) => ({
        type: 'PutLocationIntoPlay',
        location: l,
      })) as Message[]),
      { type: 'MoveTo', investigator: DANIELA, location: CODES.secondFloorHall, checked: true },
    )
    // La reacción del Pasillo: no seguir.
    while (game.pending?.question.prompt === 'prompt.reaction') game = choose(game, 'choice.skip')
    expect(getInvestigator(game, DANIELA).location).toBe(CODES.secondFloorHall)
    const moves = game.pending?.question.choices.filter((c) => c.label === 'action.move') ?? []
    expect(moves.map((c) => c.params?.location)).not.toContain('Room 212')
    game = settle(choose(game, 'ability.excelsior.pickLock', { location: 'Room 212' }))
    expect(getInvestigator(game, DANIELA).location).toBe(CODES.room212)
    expect(game.locations[CODES.room212]?.revealed).toBe(true)
  })
})

describe('Acto 2 e interludio: La verdad', () => {
  it('solo se puede avanzar con 1 pista por investigador en cada Indicio', () => {
    const low = atFollowingLeads(newGame(2), [CODES.alienDevice, CODES.timeWornLocket], 1)
    expect(() => during(low, (s) => s, { type: 'AdvanceAct' })).toThrow()
  })

  it('verdad creíble (La verdad 5): Monroe para un investigador y sin Agentes', () => {
    let game = atFollowingLeads(newGame(2), [CODES.alienDevice, CODES.timeWornLocket], 4)
    game = during(game, (s) => s, {
      type: 'PlaceAsset',
      code: CODES.sergeantMonroe,
      name: 'Sergeant Monroe',
      placement: { type: 'location', location: CODES.foyer },
    })
    game = theTruth(game)
    expect(game.scenarioMeta?.policeOnYourSide).toBe(1)
    // settle() elige al primer investigador para tomar el control de Monroe.
    expect(assetOf(game, CODES.sergeantMonroe)?.owner).toBe(DANIELA)
    expect(game.setAside.some((c) => c.code === CODES.arkhamOfficer)).toBe(false)
    expect(game.agendas[game.agendaIndex]?.code).toBe('84043')
    expect(game.acts[game.actIndex]?.code).toBe('84043')
  })

  it('verdad sin pruebas suficientes (La verdad 4): la policía no te cree', () => {
    let game = atFollowingLeads(newGame(2), [CODES.alienDevice, CODES.timeWornLocket], 2)
    game = theTruth(game)
    expect(game.scenarioMeta?.policeDontBelieveYou).toBe(1)
    expect(assetOf(game, CODES.sergeantMonroe)).toBeUndefined()
  })

  it('mentira creíble (La verdad 6) con todo encubierto', () => {
    let game = atFollowingLeads(newGame(1), [CODES.managersKey, CODES.tomeOfRituals], 1, (s) => ({
      ...s,
      scenarioMeta: { ...s.scenarioMeta, cleanedUpTheBlood: 1, hidTheBody: 1, tidiedUpTheRoom: 1 },
    }))
    game = theTruth(game, 'lie')
    expect(game.scenarioMeta?.policeOnYourSide).toBe(1)
  })
})

const CASES: { leads: [string, string]; version: number; check: (g: GameState) => void }[] = [
  {
    leads: [CODES.alienDevice, CODES.timeWornLocket],
    version: 1,
    check: (g) => {
      expect(enemyAt(g, CODES.vengefulSpecter)).toBe(CODES.room245)
      expect(assetOf(g, CODES.alienDevice)?.clues).toBe(8)
      expect(assetOf(g, CODES.timeWornLocket)?.clues).toBe(0)
    },
  },
  {
    leads: [CODES.sinisterSolution, CODES.alienDevice],
    version: 2,
    check: (g) => {
      expect(enemyAt(g, CODES.otherworldlyMeddler)).toBe(CODES.hotelRoof)
      expect(enemy(g, CODES.otherworldlyMeddler)?.doom).toBe(2)
      expect(assetOf(g, CODES.sinisterSolution)?.clues).toBe(8)
    },
  },
  {
    leads: [CODES.alienDevice, CODES.managersKey],
    version: 3,
    check: (g) => {
      expect(enemyAt(g, CODES.hotelManager)).toBe(CODES.restaurant)
      expect(assetOf(g, CODES.alienDevice)?.clues).toBe(8)
    },
  },
  {
    leads: [CODES.alienDevice, CODES.tomeOfRituals],
    version: 4,
    check: (g) => {
      expect(enemy(g, CODES.otherworldlyMeddler)?.doom).toBe(2 + 4)
      expect(assetOf(g, CODES.tomeOfRituals)?.clues).toBe(8)
    },
  },
  {
    leads: [CODES.timeWornLocket, CODES.sinisterSolution],
    version: 5,
    check: (g) => {
      expect(enemyAt(g, CODES.vengefulSpecter)).toBe(CODES.room245)
      expect(assetOf(g, CODES.sinisterSolution)?.clues).toBe(8)
    },
  },
  {
    leads: [CODES.timeWornLocket, CODES.managersKey],
    version: 6,
    check: (g) => {
      expect(enemyAt(g, CODES.hotelManager)).toBe(CODES.restaurant)
      expect(assetOf(g, CODES.timeWornLocket)?.clues).toBe(8)
    },
  },
  {
    leads: [CODES.timeWornLocket, CODES.tomeOfRituals],
    version: 7,
    check: (g) => {
      expect(enemyAt(g, CODES.dimensionalShambler)).toBe(CODES.basement)
    },
  },
  {
    leads: [CODES.sinisterSolution, CODES.managersKey],
    version: 8,
    check: (g) => {
      const brain = Object.values(g.treacheries).find((t) => t.code === CODES.harvestedBrain)
      expect(brain?.placement).toEqual({ type: 'location', location: CODES.room212 })
    },
  },
  {
    leads: [CODES.sinisterSolution, CODES.tomeOfRituals],
    version: 9,
    check: (g) => {
      expect(assetOf(g, CODES.tomeOfRituals)?.clues).toBe(8)
      expect(Object.values(g.treacheries).some((t) => t.code === CODES.harvestedBrain)).toBe(true)
    },
  },
  {
    leads: [CODES.managersKey, CODES.tomeOfRituals],
    version: 10,
    check: (g) => {
      expect(enemyAt(g, CODES.dimensionalShambler)).toBe(CODES.basement)
      expect(g.doom).toBe(4)
    },
  },
]

const enemy = (g: GameState, code: string) => Object.values(g.enemies).find((e) => e.code === code)
const enemyAt = (g: GameState, code: string) => enemy(g, code)?.location

describe('La verdad 7: El verdadero culpable', () => {
  for (const c of CASES) {
    it(`v. ${c.version}: prepara el plan y el acto correctos`, () => {
      let game = atFollowingLeads(newGame(2), c.leads, 4)
      game = theTruth(game, 'lie')
      const code = `840${42 + c.version}`
      expect(game.agendas[game.agendaIndex]?.code).toBe(code)
      expect(game.acts[game.actIndex]?.code).toBe(code)
      expect(game.outcome).toBeNull()
      c.check(game)
    })
  }

  it('si el plan llega a su umbral, R2; si se cumple el objetivo, R1', () => {
    let game = settle(
      theTruth(atFollowingLeads(newGame(2), [CODES.alienDevice, CODES.timeWornLocket], 4), 'lie'),
    )
    const doom = settle(
      during(
        game,
        (s) => ({ ...s, doom: 5 }),
        { type: 'PlaceDoom', amount: 1 },
        { type: 'CheckAgenda' },
      ),
    )
    expect(doom.outcome).toEqual({ type: 'resolution', resolution: 2 })
    const specter = enemy(game, CODES.vengefulSpecter)!
    game = settle(during(game, (s) => s, { type: 'DefeatEnemy', enemy: specter.id }))
    expect(game.outcome).toEqual({ type: 'resolution', resolution: 1 })
  })
})
