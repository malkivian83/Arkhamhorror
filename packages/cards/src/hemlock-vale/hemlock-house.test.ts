import {
  createGame,
  dispatch,
  emptyCampaignLog,
  newValley,
  printedCode,
  scenarioBehavior,
  type GameState,
} from '@lcg/engine'
import { testInvestigator, throughSetup, choose } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import {
  BEDROOMS,
  enemyLocationAt,
  enemyLocations,
  floorOf,
  HEMLOCK_HOUSE,
  hemlockHouse,
  HOUSE,
  isDormant,
  LEFT,
  MIDDLE,
  predationElderThings,
  RIGHT,
  seals,
  victoryEnemyLocations,
} from './hemlock-house'

const players = ['a', 'b']
const log = (time: 'day' | 'night' = 'day', day: 1 | 2 | 3 = 1) => ({
  ...emptyCampaignLog(players),
  valley: { ...newValley(), day, time },
})
const start = (time: 'day' | 'night' = 'day', day: 1 | 2 | 3 = 1) =>
  throughSetup(
    createGame({
      seed: 21,
      scenario: hemlockHouse({
        difficulty: 'standard',
        seed: 21,
        investigators: players,
        log: log(time, day),
      }),
      investigators: players.map((id) => testInvestigator(id)),
      campaignLog: log(time, day),
    }),
  )
const quiet = (state: GameState): GameState => ({ ...state, pending: null, queue: [] })
const run = (state: GameState): GameState => {
  let next = state
  while (next.pending) next = choose(next, next.pending.question.choices[0]!.label)
  return next
}
const send = (state: GameState, key: string, data: Record<string, string | number> = {}) =>
  run(dispatch(state, { type: 'ScenarioSpecific', key, data }))
const atPosition = (state: GameState, column: number, floor: number) =>
  Object.values(state.locations).find(
    (l) => l.position?.[0] === column && l.position[1] === 5 - floor,
  )

// Guía, pp. 14–15: preparación y colocación de Lugares.
describe('La Casa Cicuta: preparación', () => {
  it('coloca el piso 1, seis Lugares en los pisos 2–3 y un Dormitorio en el piso 4', () => {
    const game = start()
    expect(game.scenarioId).toBe(HEMLOCK_HOUSE)
    expect(game.grid).toBe(true)
    expect(Object.keys(game.locations)).toHaveLength(10)
    expect(atPosition(game, LEFT, 1)!.id).toBe(HOUSE.parlor)
    expect(atPosition(game, MIDDLE, 1)!.id).toBe(HOUSE.foyer)
    expect(atPosition(game, RIGHT, 1)!.id).toBe(HOUSE.diningRoom)
    for (const column of [LEFT, MIDDLE, RIGHT])
      for (const floor of [2, 3]) expect(atPosition(game, column, floor)).toBeDefined()
    expect(BEDROOMS).toContain(atPosition(game, MIDDLE, 4)!.id)
    expect(atPosition(game, LEFT, 4)).toBeUndefined()
    // Lado Letargo boca arriba: revelados y con pistas por investigador.
    expect(Object.values(game.locations).every((l) => l.revealed)).toBe(true)
    expect(game.locations[HOUSE.parlor]!.clues).toBe(4)
    expect(game.investigators.every((i) => i.location === HOUSE.foyer)).toBe(true)
    expect(game.setAsideLocations[HOUSE.shapelessCellar]).toBeDefined()
    expect(game.setAside.filter((c) => c.code === HOUSE.outOfTheWalls)).toHaveLength(4)
    expect(game.agendas[1]!.code).toBe(HOUSE.houseStirsV1)
  })

  it('el Día 3 se empieza en el Dormitorio del piso 4 y el Día 2 usa el plan 2 (v.II)', () => {
    const third = start('day', 3)
    const top = atPosition(third, MIDDLE, 4)!.id
    expect(third.investigators.every((i) => i.location === top)).toBe(true)
    expect(start('day', 2).agendas[1]!.code).toBe(HOUSE.houseStirsV2)
  })

  it('el velo del Dormitorio es su piso más 1', () => {
    const game = start()
    const top = atPosition(game, MIDDLE, 4)!
    expect(floorOf(game, top.id)).toBe(4)
    const behavior = scenarioBehavior(HEMLOCK_HOUSE)!
    expect(top.shroud + behavior.shroudModifier!(game, top)).toBe(5)
    expect(behavior.shroudModifier!(game, game.locations[HOUSE.parlor]!)).toBe(0)
  })
})

// Guía, p. 16: Lugares-Enemigo.
describe('La Casa Cicuta: Lugares-Enemigo', () => {
  it('dar la vuelta conserva las fichas y crea un Enemigo Masivo en el Lugar', () => {
    const game = quiet(start())
    const flipped = send(game, 'flip', { location: HOUSE.parlor })
    const self = enemyLocationAt(flipped, HOUSE.parlor)!
    expect(self.code).toBe(`${HOUSE.parlor}b`)
    expect(self.keywords).toEqual(['massive', 'retaliate'])
    expect(flipped.locations[HOUSE.parlor]!.clues).toBe(4)
    expect(flipped.locations[HOUSE.parlor]!.shownCode).toBe(`${HOUSE.parlor}b`)
    expect(flipped.locations[HOUSE.parlor]!.shroud).toBe(4)
    expect(isDormant(flipped, HOUSE.parlor)).toBe(false)
    // De vuelta al lado Lugar, el daño se recuerda para la próxima vez.
    const hurt = {
      ...flipped,
      enemies: { ...flipped.enemies, [self.id]: { ...self, damageTaken: 2 } },
    }
    const back = send(hurt, 'flip', { location: HOUSE.parlor })
    expect(enemyLocationAt(back, HOUSE.parlor)).toBeUndefined()
    expect(back.locations[HOUSE.parlor]!.name).toBe('Parlor')
    expect(back.locations[HOUSE.parlor]!.shownCode).toBeUndefined()
    const again = send(back, 'flip', { location: HOUSE.parlor })
    expect(enemyLocationAt(again, HOUSE.parlor)!.damageTaken).toBe(2)
  })

  it('al revelarse, el Vestíbulo viviente ataca a cada investigador en él', () => {
    const game = quiet(start())
    const flipped = send(game, 'flip', { location: HOUSE.foyer })
    expect(flipped.investigators.every((i) => i.damage === 2)).toBe(true)
  })

  it('no puede ser movido por efectos de cartas', () => {
    const game = send(quiet(start()), 'flip', { location: HOUSE.diningRoom })
    const self = enemyLocationAt(game, HOUSE.diningRoom)!
    const moved = dispatch(game, { type: 'MoveEnemy', enemy: self.id, location: HOUSE.foyer })
    expect(moved.enemies[self.id]!.location).toBe(HOUSE.diningRoom)
  })

  it('al ser derrotado va a la zona de victoria y la columna cae un piso', () => {
    const game = send(quiet(start()), 'flip', { location: HOUSE.parlor })
    const above2 = atPosition(game, LEFT, 2)!.id
    const above3 = atPosition(game, LEFT, 3)!.id
    const self = enemyLocationAt(game, HOUSE.parlor)!
    const inside = {
      ...game,
      investigators: game.investigators.map((i) => ({ ...i, location: HOUSE.parlor })),
    }
    const defeated = run(dispatch(inside, { type: 'DefeatEnemy', enemy: self.id }))
    expect(defeated.locations[HOUSE.parlor]).toBeUndefined()
    expect(victoryEnemyLocations(defeated)).toBe(1)
    expect(defeated.locations[above2]!.position).toEqual([LEFT, 4])
    expect(defeated.locations[above3]!.position).toEqual([LEFT, 3])
    expect(defeated.investigators.every((i) => i.location === above2)).toBe(true)
    expect(defeated.locations[above2]!.connections).toContain(HOUSE.foyer)
  })

  it('sin Lugares encima, lo que había pasa a un Lugar adyacente elegido', () => {
    const game = quiet(start())
    const top = atPosition(game, MIDDLE, 4)!.id
    const flipped = send(game, 'flip', { location: top })
    const self = enemyLocationAt(flipped, top)!
    const inside = {
      ...flipped,
      investigators: flipped.investigators.map((i) => ({ ...i, location: top })),
    }
    const defeated = run(dispatch(inside, { type: 'DefeatEnemy', enemy: self.id }))
    const below = atPosition(game, MIDDLE, 3)!.id
    expect(defeated.locations[top]).toBeUndefined()
    expect(defeated.investigators.every((i) => i.location === below)).toBe(true)
  })

  it('si se elimina toda la columna central, la izquierda se desliza junto a la derecha', () => {
    let game = quiet(start())
    for (const floor of [4, 3, 2, 1]) {
      const id = atPosition(game, MIDDLE, floor)!.id
      game = send(game, 'flip', { location: id })
      game = run(dispatch(game, { type: 'DefeatEnemy', enemy: enemyLocationAt(game, id)!.id }))
    }
    expect(Object.values(game.locations).some((l) => l.position?.[0] === LEFT)).toBe(false)
    expect(game.locations[HOUSE.parlor]!.position).toEqual([MIDDLE, 4])
    expect(game.locations[HOUSE.parlor]!.connections).toContain(HOUSE.diningRoom)
  })
})

// Carta de Historia La casa depredadora (10524) y planes.
describe('La Casa Cicuta: depredación y sellos', () => {
  it('el plan 1b da la vuelta al Lugar más cercano y crea la bolsa según el día', () => {
    const game = quiet(start())
    const advanced = run(dispatch(game, { type: 'AdvanceAgenda' }))
    expect(enemyLocations(advanced).map((e) => e.location)).toEqual([HOUSE.foyer])
    expect(advanced.scenarioMeta?.['predation:cultist']).toBe(3)
    expect(predationElderThings(advanced)).toBe(1)
    expect(advanced.setAside.some((c) => c.code === HOUSE.outOfTheWalls)).toBe(false)
    expect(advanced.encounterDeck.filter((c) => c.code === HOUSE.pulledIn)).toHaveLength(2)
  })

  it('la ficha de sectario se aparta; la tablilla las devuelve y hace atacar', () => {
    const game = quiet(start())
    const ready = {
      ...game,
      scenarioMeta: {
        ...game.scenarioMeta,
        predationBag: 1,
        'predation:cultist': 1,
        'predation:tablet': 0,
        'predation:elderThing': 0,
      },
    }
    const cultist = send(ready, 'predation')
    expect(cultist.scenarioMeta?.['predation:cultist']).toBe(0)
    expect(cultist.scenarioMeta?.['predationAside:cultist']).toBe(1)
    const tablet = send(
      { ...cultist, scenarioMeta: { ...cultist.scenarioMeta, 'predation:tablet': 1 } },
      'predation',
    )
    expect(tablet.scenarioMeta?.['predation:cultist']).toBe(1)
    expect(tablet.scenarioMeta?.['predationAside:cultist']).toBe(0)
    // Sin Lugares-Enemigo que ataquen, el jefe roba la carta superior de Encuentros.
    expect(tablet.encounterDeck.length).toBeLessThan(cultist.encounterDeck.length)
  })

  it('Gideon cancela la siguiente depredación', () => {
    const game = quiet(start())
    const ready = {
      ...game,
      scenarioMeta: {
        ...game.scenarioMeta,
        predationBag: 1,
        cancelPredation: 1,
        'predation:elderThing': 1,
      },
    }
    const canceled = send(ready, 'predation')
    expect(enemyLocations(canceled)).toHaveLength(0)
    expect(canceled.scenarioMeta?.cancelPredation).toBe(0)
  })

  it('el acto 1 sella el Lugar gastando 1 pista por investigador, en grupo', () => {
    const game = quiet(start())
    const withClues = {
      ...game,
      investigators: game.investigators.map((i) => ({ ...i, clues: 1 })),
    }
    const sealed = send(
      run(dispatch(withClues, { type: 'PayGroupClues', amount: 2, from: ['a', 'b'] })),
      'seal',
      { location: HOUSE.foyer, investigator: 'a' },
    )
    expect(seals(sealed, HOUSE.foyer)).toBe(1)
    expect(sealed.investigators.map((i) => i.clues)).toEqual([0, 0])
    // Un Lugar sellado no se da la vuelta en una prueba de depredación.
    const flipped = send(
      {
        ...sealed,
        scenarioMeta: { ...sealed.scenarioMeta, predationBag: 1, 'predation:elderThing': 1 },
      },
      'predation',
    )
    expect(enemyLocationAt(flipped, HOUSE.foyer)).toBeUndefined()
    expect(enemyLocations(flipped)).toHaveLength(1)
  })

  it('con más sellos que Lugares-Enemigo derrotados, entra el Sótano informe', () => {
    const game = quiet(start())
    const sealed = {
      ...game,
      locations: Object.fromEntries(
        Object.entries(game.locations).map(([id, l]) => [id, { ...l, resources: 1 }]),
      ),
    }
    const advanced = run(dispatch(sealed, { type: 'Forced', trigger: { type: 'roundEnds' } }))
    expect(advanced.acts[advanced.actIndex]!.code).toBe(HOUSE.heartOfTheHouse)
    const cellar = advanced.locations[HOUSE.shapelessCellar]!
    expect(cellar.position).toEqual([MIDDLE, 5])
    expect(floorOf(advanced, cellar.id)).toBe(0)
    expect(enemyLocationAt(advanced, HOUSE.shapelessCellar)!.health).toBe(5)
    expect(advanced.locations[HOUSE.foyer]!.connections).toContain(HOUSE.shapelessCellar)
  })

  it('con más Lugares-Enemigo derrotados, se pasa a Contra la casa', () => {
    const game = quiet(start())
    const ruined = {
      ...game,
      victoryDisplay: ['10532b', '10533b', '10534b', '10535b', '10536b', '10537b', '10538b'],
    }
    const advanced = run(dispatch(ruined, { type: 'Forced', trigger: { type: 'roundEnds' } }))
    expect(advanced.acts[advanced.actIndex]!.code).toBe(HOUSE.againstTheHouse)
    expect(advanced.locations[HOUSE.shapelessCellar]).toBeUndefined()
  })
})

// Guía, p. 18: Resolución 2.
describe('La Casa Cicuta: resoluciones', () => {
  it('da experiencia por 8 y 10 sellos y por 8 y 10 Lugares-Enemigo, y tacha la zona', () => {
    const game = quiet(start())
    const done = run(
      dispatch(
        {
          ...game,
          locations: Object.fromEntries(
            Object.entries(game.locations).map(([id, l]) => [id, { ...l, resources: 1 }]),
          ),
          victoryDisplay: Array.from({ length: 8 }, (_, i) => `105${32 + i}b`),
        },
        { type: 'ScenarioSpecific', key: 'resolution', data: { r: 1 } },
      ),
    )
    const valley = done.campaignLog!.valley!
    expect(valley.areasSurveyed).toContain('hemlockHarbor')
    expect(valley.route).toContain('hemlock-vale-first-evening')
    // 10 sellos (+2) y 8 Lugares-Enemigo (+1), más la Victoria de los derrotados.
    expect(done.campaignLog!.investigators.a!.xp).toBeGreaterThanOrEqual(3)
  })
})

// Fichas de la tarjeta de referencia 10523.
describe('La Casa Cicuta: tarjeta de referencia', () => {
  it('la calavera depende del piso del investigador', () => {
    const game = quiet(start('day', 3))
    const top = game.investigators[0]!.location!
    expect(printedCode(top)).toMatch(/^1053[2-5]$/)
    const skull = scenarioBehavior(HEMLOCK_HOUSE)!.tokenEffect!(game, 'skull', 'a')
    expect(skull.modifier).toBe(-4)
    const foyer = {
      ...game,
      investigators: game.investigators.map((i) => ({ ...i, location: HOUSE.foyer })),
    }
    expect(scenarioBehavior(HEMLOCK_HOUSE)!.tokenEffect!(foyer, 'skull', 'a').modifier).toBe(-1)
    const hard = { ...foyer, difficulty: 'hard' as const }
    expect(scenarioBehavior(HEMLOCK_HOUSE)!.tokenEffect!(hard, 'skull', 'a').modifier).toBe(-2)
  })
})

// Guía, pp. 15 y 17–18: habitantes y códice.
describe('La Casa Cicuta: habitantes y códice', () => {
  const placed = (state: GameState, code: string) =>
    Object.values(state.placedAssets ?? {}).find((a) => a.code === code)
  const codex = (state: GameState, n: number, investigator = 'a') =>
    send(state, 'codex', { n, investigator })

  it('el Día 1 coloca a Gideon, a William y a la Pequeña Sylvie; de noche, a nadie', () => {
    const game = start()
    expect(placed(game, '10698')?.placement).toEqual({ type: 'location', location: HOUSE.parlor })
    const top = atPosition(game, MIDDLE, 4)!.id
    expect(placed(game, '10696')?.placement).toEqual({ type: 'location', location: top })
    const sylvie = placed(game, HOUSE.littleSylvie)!
    expect(sylvie.placement.type).toBe('location')
    expect(Object.values(start('night').placedAssets ?? {})).toHaveLength(0)
    const third = start('day', 3)
    expect(placed(third, '10699')?.placement).toEqual({
      type: 'location',
      location: HOUSE.parlor,
    })
    expect(placed(third, '10700')?.placement).toEqual({ type: 'location', location: HOUSE.foyer })
  })

  it('códice 4 el Día 1: pistas y la muñeca; con ella, William se une y sube la relación', () => {
    const game = quiet(start())
    const asked = codex(game, 4)
    expect(asked.investigators.map((i) => i.clues)).toEqual([1, 1])
    expect(asked.scenarioMeta?.['codex:4']).toBeUndefined()
    const sylvie = placed(asked, HOUSE.littleSylvie)!
    const holding = run(
      dispatch(asked, { type: 'TakeControlOfPlaced', placed: sylvie.id, investigator: 'a' }),
    )
    const found = codex(holding, 4)
    expect(found.scenarioMeta?.foundSylvie).toBe(1)
    expect(Object.values(found.assets).some((a) => a.code === '10696' && a.owner === 'a')).toBe(
      true,
    )
    expect(found.campaignLog!.valley!.residents.williamHemlock.level).toBe(1)
  })

  it('códice 6: la primera vez cancela la siguiente depredación; la segunda, sube la relación', () => {
    const game = quiet(start())
    const first = codex(game, 6)
    expect(first.scenarioMeta?.cancelPredation).toBe(1)
    const second = codex(first, 6)
    expect(second.scenarioMeta?.['codex:6']).toBe(1)
    expect(second.campaignLog!.valley!.residents.gideonMizrah.level).toBe(1)
  })

  it('el Día 2, William y Judith juntos discuten (códice Σ)', () => {
    const game = quiet(start('day', 2))
    const judith = placed(game, '10699')!
    const together = run(
      dispatch(game, {
        type: 'MovePlacedAsset',
        placed: judith.id,
        placement: placed(game, '10696')!.placement,
      }),
    )
    const argued = codex(together, 7)
    // El primer jugador elige «Judith tiene razón»: William se retira.
    expect(placed(argued, '10696')).toBeUndefined()
    expect(argued.campaignLog!.valley!.residents.judithPark.level).toBe(1)
    expect(argued.scenarioMeta?.['codex:4']).toBe(1)
  })
})
