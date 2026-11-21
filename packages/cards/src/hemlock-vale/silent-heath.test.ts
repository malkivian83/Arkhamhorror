import {
  createGame,
  dispatch,
  emptyCampaignLog,
  newValley,
  scenarioBehavior,
  type EncounterCard,
  type GameState,
} from '@lcg/engine'
import { choose, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { RESIDENTS } from './welcome'
import {
  broodSoldier,
  colorlessLarva,
  HEATH,
  saltChamber,
  SILENT_HEATH,
  silentHeath,
} from './silent-heath'

const players = ['a', 'b']
const log = (time: 'day' | 'night' = 'day', day: 1 | 2 | 3 = 1) => ({
  ...emptyCampaignLog(players),
  valley: { ...newValley(), day, time },
})
const start = (time: 'day' | 'night' = 'day', day: 1 | 2 | 3 = 1) =>
  throughSetup(
    createGame({
      seed: 8,
      scenario: silentHeath({
        difficulty: 'standard',
        seed: 8,
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
  for (let n = 0; next.pending && n < 50; n++)
    next = choose(next, next.pending.question.choices[0]!.label)
  return next
}
const send = (state: GameState, key: string, data: Record<string, string | number> = {}) =>
  run(dispatch(state, { type: 'ScenarioSpecific', key, data }))
const behavior = () => scenarioBehavior(SILENT_HEATH)!
const warrens = (state: GameState) => send(quiet(state), 'warrens')
const withBeneath = (state: GameState, location: string, beneath: EncounterCard[]): GameState => ({
  ...state,
  locations: { ...state.locations, [location]: { ...state.locations[location]!, beneath } },
})

// Guía, pp. 19–20.
describe('El páramo silencioso: preparación', () => {
  it('pone los tres Lugares iniciales conectados por sus iconos y aparta tres Cuevas', () => {
    const game = start()
    expect(game.scenarioId).toBe(SILENT_HEATH)
    expect(game.grid).toBe(true)
    const ruins = game.locations[HEATH.pearlEstateRuins]!
    expect(ruins.position).toEqual([1, 1])
    expect(ruins.connections.sort()).toEqual([HEATH.ashenSlope, HEATH.crystalGrove].sort())
    expect(game.locations[HEATH.crystalGrove]!.connections).toContain(HEATH.ashenSlope)
    expect(game.investigators.every((i) => i.location === HEATH.pearlEstateRuins)).toBe(true)
    expect(Object.keys(game.setAsideLocations)).toHaveLength(3)
    expect(game.setAside.map((c) => c.code).sort()).toEqual(
      [HEATH.broodQueen, '10721', '10721'].sort(),
    )
    expect(game.agendas[1]!.code).toBe(HEATH.desolationV1)
    expect(start('day', 2).agendas[1]!.code).toBe(HEATH.desolationV2)
  })

  it('de día coloca al habitante del día; de noche, ninguno', () => {
    const placed = (state: GameState) =>
      Object.values(state.placedAssets ?? {}).map((a) => [
        a.code,
        a.placement.type === 'location' ? a.placement.location : '',
      ])
    expect(placed(start())).toEqual([[RESIDENTS.leahAtwood.code, HEATH.pearlEstateRuins]])
    expect(placed(start('day', 2))).toEqual([[HEATH.drRosaMarquez, HEATH.crystalGrove]])
    expect(placed(start('day', 3))).toEqual([[RESIDENTS.motherRachel.code, HEATH.ashenSlope]])
    expect(placed(start('night'))).toEqual([])
  })
})

// Acto 1b «Las madrigueras».
describe('El páramo silencioso: las madrigueras', () => {
  it('las Cuevas entran sin revelar adyacentes y cada Lugar recibe una carta boca abajo', () => {
    const game = quiet(start())
    const deck = game.encounterDeck.length
    const after = warrens(game)
    const caves = Object.keys(game.setAsideLocations)
    expect(caves.every((c) => after.locations[c] && !after.locations[c]!.revealed)).toBe(true)
    expect(caves.map((c) => after.locations[c]!.position).sort()).toEqual(
      [
        [1, 2],
        [2, 1],
        [3, 2],
      ].sort(),
    )
    const stacks = Object.values(after.locations).map((l) => l.beneath ?? [])
    expect(stacks.every((s) => s.length === 1)).toBe(true)
    expect(
      stacks
        .flat()
        .filter((c) => c.kind === 'location')
        .map((c) => c.code)
        .sort(),
    ).toEqual([HEATH.saltChamber, HEATH.larvalTunnel, HEATH.crystalNursery].sort())
    expect(after.encounterDeck).toHaveLength(deck - 3)
    // La Arboleda es adyacente a las Cuevas de abajo y a la del centro.
    expect(after.locations[HEATH.crystalGrove]!.connections.length).toBeGreaterThanOrEqual(4)
  })

  it('una Guarida robada entra adyacente al Lugar y forma un montón con unos Restos', () => {
    const game = withBeneath(warrens(quiet(start())), HEATH.pearlEstateRuins, [saltChamber])
    const drawn = send(game, 'drawBeneath', { investigator: 'a', location: HEATH.pearlEstateRuins })
    const chamber = Object.values(drawn.locations).find((l) => l.id.startsWith(HEATH.saltChamber))!
    expect(chamber).toBeDefined()
    const [x, y] = chamber.position!
    expect(Math.abs(x - 1) + Math.abs(y - 1)).toBe(1)
    expect(chamber.beneath).toHaveLength(3)
    expect(chamber.beneath!.filter((c) => c.code === HEATH.remainsChild)).toHaveLength(1)
    expect(drawn.scenarioMeta?.remainsDealt).toBe(1)
  })
})

describe('El páramo silencioso: Restos cristalinos', () => {
  const reveal = (state: GameState) =>
    send(
      withBeneath(state, HEATH.pearlEstateRuins, [
        { kind: 'treachery', code: HEATH.remainsMother, name: 'Crystal Remains', keywords: [] },
      ]),
      'drawBeneath',
      { investigator: 'a', location: HEATH.pearlEstateRuins },
    )

  it('se ponen en juego en tu zona y no van a la pila de descartes', () => {
    const game = reveal(quiet(start()))
    const remains = Object.values(game.assets).find((a) => a.code === HEATH.remainsMother)
    expect(remains?.owner).toBe('a')
    expect(game.encounterDiscard.some((c) => c.code === HEATH.remainsMother)).toBe(false)
    expect(Object.values(game.treacheries).some((t) => t.code === HEATH.remainsMother)).toBe(false)
  })

  it('desistir en las Ruinas los añade a la zona de victoria (Victoria 1)', () => {
    const game = reveal(quiet(start()))
    const asset = Object.values(game.assets).find((a) => a.code === HEATH.remainsMother)!
    const won = send(game, 'remainsToVictory', { asset: asset.id })
    expect(won.victoryDisplay).toContain(HEATH.remainsMother)
    expect(won.victoryPoints).toBe(1)
    expect(won.assets[asset.id]).toBeUndefined()
  })

  it('si son derrotados, vuelven boca abajo bajo la Guarida más cercana', () => {
    const lairs = send(
      withBeneath(warrens(quiet(start())), HEATH.pearlEstateRuins, [saltChamber]),
      'drawBeneath',
      { investigator: 'a', location: HEATH.pearlEstateRuins },
    )
    const chamber = Object.values(lairs.locations).find((l) => l.id.startsWith(HEATH.saltChamber))!
    const before = chamber.beneath!.length
    const back = send(lairs, 'remainsDefeated', { code: HEATH.remainsFather, investigator: 'a' })
    expect(back.locations[chamber.id]!.beneath).toHaveLength(before + 3)
    expect(back.locations[chamber.id]!.beneath!.some((c) => c.code === HEATH.remainsFather)).toBe(
      true,
    )
  })
})

describe('El páramo silencioso: Insectos y Reina de progenie', () => {
  it('el códice Σ hace aparecer a la Reina con los Insectos de la zona de victoria', () => {
    const game = {
      ...quiet(start('day', 2)),
      victoryDisplay: [HEATH.colorlessLarva, HEATH.broodSoldier],
    }
    const spawned = send(game, 'queen')
    const queen = Object.values(spawned.enemies).find((e) => e.code === HEATH.broodQueen)!
    expect(queen).toBeDefined()
    expect(spawned.victoryDisplay).toEqual([])
    const here = Object.values(spawned.enemies).filter((e) => e.location === queen.location)
    expect(here.map((e) => e.code).sort()).toEqual(
      [HEATH.broodQueen, HEATH.colorlessLarva, HEATH.broodSoldier].sort(),
    )
    // +1 combate por cada otro Insecto; los Insectos con ella pierden Indiferente.
    expect(behavior().enemyStat!(spawned, queen, 'fight')).toBe(2)
    const larva = here.find((e) => e.code === HEATH.colorlessLarva)!
    expect(behavior().enemyKeyword!(spawned, larva, 'aloof')).toBe(false)
    expect(spawned.scenarioMeta?.queenSpawned).toBe(1)
  })

  it('Desolación: los Insectos pierden Indiferente; en la v.II ganan Cazador', () => {
    const game = send(quiet(start('day', 2)), 'queen')
    const soldier = {
      ...broodSoldier,
      id: 'x',
      location: HEATH.ashenSlope,
    } as unknown as Parameters<NonNullable<ReturnType<typeof behavior>['enemyKeyword']>>[1]
    expect(behavior().enemyKeyword!(game, soldier, 'aloof')).toBeNull()
    const desolate = { ...game, agendaIndex: 1 }
    expect(behavior().enemyKeyword!(desolate, soldier, 'aloof')).toBe(false)
    expect(behavior().enemyKeyword!(desolate, soldier, 'hunter')).toBe(true)
  })

  it('el Soldado de la progenie preparado da +2 de velo a su Lugar', () => {
    const game = run(
      dispatch(quiet(start()), {
        type: 'SpawnEnemy',
        card: broodSoldier,
        location: HEATH.ashenSlope,
        engageWith: null,
      }),
    )
    const slope = game.locations[HEATH.ashenSlope]!
    expect(behavior().shroudModifier!(game, slope)).toBe(2)
    const soldier = Object.values(game.enemies).find((e) => e.code === HEATH.broodSoldier)!
    const tired = {
      ...game,
      enemies: { ...game.enemies, [soldier.id]: { ...soldier, exhausted: true } },
    }
    expect(behavior().shroudModifier!(tired, slope)).toBe(0)
  })

  it('la Larva incolora es derrotada después de atacar', () => {
    const game = run(
      dispatch(quiet(start()), {
        type: 'SpawnEnemy',
        card: colorlessLarva,
        location: HEATH.pearlEstateRuins,
        engageWith: 'a',
      }),
    )
    const larva = Object.values(game.enemies).find((e) => e.code === HEATH.colorlessLarva)!
    const attacked = run(
      dispatch(game, {
        type: 'EnemyAttack',
        enemy: larva.id,
        investigator: 'a',
        exhaustAfter: true,
      }),
    )
    expect(attacked.enemies[larva.id]).toBeUndefined()
    expect(attacked.investigators[0]!.horror).toBe(1)
    expect(attacked.victoryDisplay).toContain(HEATH.colorlessLarva)
  })
})

describe('El páramo silencioso: resoluciones', () => {
  const resolve = (remains: number) =>
    send(
      {
        ...quiet(start()),
        victoryDisplay: [HEATH.remainsChild, HEATH.remainsFather, HEATH.remainsMother].slice(
          0,
          remains,
        ),
      },
      'resolution',
      { r: 0 },
    )
  const notes = (state: GameState) => state.campaignLog?.notes ?? []

  it('con los tres Restos: R1, R3 y R4 (sepultura, diario y Cresta Perla explorada)', () => {
    const game = resolve(3)
    expect(notes(game)).toEqual(
      expect.arrayContaining([
        'hemlockValeLaidThePearlFamilyToRest',
        'hemlockValeMadamePearlsDiaryRecovered',
      ]),
    )
    expect(game.campaignLog?.valley?.areasSurveyed).toContain('pearlRidge')
  })

  it('con uno o dos Restos, R2; sin Restos, directamente R4', () => {
    expect(notes(resolve(1))).toContain('hemlockValeRemainsPartiallyRecovered')
    const none = resolve(0)
    expect(notes(none)).not.toContain('hemlockValeMadamePearlsDiaryRecovered')
    expect(none.campaignLog?.valley?.areasSurveyed).toContain('pearlRidge')
  })
})
