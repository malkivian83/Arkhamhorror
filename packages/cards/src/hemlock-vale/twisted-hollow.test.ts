import { createGame, dispatch, emptyCampaignLog, newValley, type GameState } from '@lcg/engine'
import { choose, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { HEATH } from './silent-heath'
import {
  darkness,
  HOLLOW,
  isDark,
  litLantern,
  pursuit,
  stalkingHybrid,
  TWISTED_HOLLOW,
  twistedHollow,
  woodsDeck,
} from './twisted-hollow'

const start = (players: string[], truth = true) => {
  const log = {
    ...emptyCampaignLog(players),
    notes: [truth ? 'hemlockValeMotherRachelShowedTheWay' : 'hemlockValeInvestigatorsLostThePath'],
    valley: { ...newValley(), day: 1 as const, time: 'night' as const },
  }
  return throughSetup(
    createGame({
      seed: 6,
      scenario: twistedHollow({ difficulty: 'standard', seed: 6, investigators: players, log }),
      investigators: players.map((id) => testInvestigator(id)),
      campaignLog: log,
    }),
  )
}
/** Resuelve solo las preguntas de la preparación. */
const settle = (state: GameState): GameState => {
  let next = state
  while (
    next.pending &&
    ['prompt.hemlockVale.takeControl', 'prompt.story'].includes(next.pending.question.prompt)
  )
    next = choose(next, next.pending.question.choices[0]!.label)
  return next
}
const quiet = (state: GameState): GameState => ({ ...state, pending: null, queue: [] })
const run = (state: GameState): GameState => {
  let next = state
  for (let n = 0; next.pending && n < 40; n++)
    next = choose(next, next.pending.question.choices[0]!.label)
  return next
}
const send = (state: GameState, key: string, data: Record<string, string | number> = {}) =>
  run(dispatch(state, { type: 'ScenarioSpecific', key, data }))
const at = (state: GameState, x: number, y: number) =>
  Object.values(state.locations).find((l) => l.position?.[0] === x && l.position[1] === y)

// Guía, pp. 34–36.
describe('La hondonada retorcida: preparación', () => {
  it('con la verdad, empieza en el Prado destelleante con el Rayo de esperanza encendido', () => {
    const game = settle(start(['a', 'b']))
    expect(game.scenarioId).toBe(TWISTED_HOLLOW)
    expect(game.investigators.every((i) => i.location === HOLLOW.glimmeringWoods)).toBe(true)
    expect(litLantern(game)?.code).toBe(HOLLOW.lanternBeacon)
    expect(Object.values(game.assets).map((a) => a.code)).toContain(HEATH.drRosaMarquez)
    expect(darkness(game)).toBe(1)
    // Cuatro Lugares sin revelar alrededor; el resto (13 − 2 − 4) en el mazo de Bosque.
    for (const [x, y] of [
      [5, 4],
      [6, 5],
      [5, 6],
      [4, 5],
    ])
      expect(at(game, x!, y!)?.revealed).toBe(false)
    expect(woodsDeck(game)).toHaveLength(7)
    expect(game.setAsideLocations[HOLLOW.theTwistedHollow]).toBeDefined()
  })

  it('extraviados, el Prado destelleante va al mazo y el Farol es la Débil esperanza', () => {
    const game = settle(start(['a', 'b'], false))
    expect(game.investigators[0]!.location).not.toBe(HOLLOW.glimmeringWoods)
    expect(litLantern(game)?.code).toBe(HOLLOW.lanternFaint)
  })
})

describe('La hondonada retorcida: Farol y oscuridad', () => {
  it('el Rayo de esperanza quita Oscuro a su Lugar y a los conectados', () => {
    const game = quiet(settle(start(['a', 'b'])))
    expect(isDark(game, HOLLOW.glimmeringWoods)).toBe(false)
    expect(isDark(game, at(game, 5, 4)!.id)).toBe(false)
    // Al apagarse queda colocado y todo vuelve a ser Oscuro.
    const out = send(game, 'stolenLight')
    expect(litLantern(out)).toBeUndefined()
    expect(isDark(out, HOLLOW.glimmeringWoods)).toBe(true)
    expect(Object.values(out.placedAssets ?? {}).map((a) => a.code)).toContain(
      HOLLOW.lanternBeaconUnlit,
    )
  })

  it('revelar un Lugar coloca cartas del mazo de Bosque a su alrededor', () => {
    const game = quiet(settle(start(['a', 'b'])))
    const north = at(game, 5, 4)!
    const before = woodsDeck(game).length
    const placed = send(game, 'surround', { location: north.id })
    expect(woodsDeck(placed).length).toBe(before - 3)
    for (const [x, y] of [
      [5, 3],
      [6, 4],
      [4, 4],
    ])
      expect(at(placed, x!, y!)).toBeDefined()
  })
})

describe('La hondonada retorcida: persecución', () => {
  it('en el acto 1, un Enemigo robado sin instrucciones de aparición va a la persecución', () => {
    const game = quiet(settle(start(['a', 'b'])))
    const drawn = run(
      dispatch(
        { ...game, encounterDeck: [stalkingHybrid, ...game.encounterDeck] },
        { type: 'DrawEncounterCard', investigator: 'a' },
      ),
    )
    expect(Object.values(drawn.enemies).some((e) => e.code === HOLLOW.stalkingHybrid)).toBe(false)
    expect(pursuit(drawn).map((p) => p.card.code)).toContain(HOLLOW.stalkingHybrid)
  })

  it('un Enemigo vuelve de la persecución con sus fichas', () => {
    const game = quiet(settle(start(['a', 'b'])))
    const spawned = run(
      dispatch(game, {
        type: 'SpawnEnemy',
        card: stalkingHybrid,
        location: HOLLOW.glimmeringWoods,
        engageWith: null,
        initialDamage: 1,
      }),
    )
    const enemy = Object.values(spawned.enemies)[0]!
    const chased = send(spawned, 'toPursuit', { enemy: enemy.id })
    expect(chased.enemies[enemy.id]).toBeUndefined()
    expect(pursuit(chased)[0]!.damage).toBe(1)
    const back = send(chased, 'fromPursuit', {
      index: 0,
      location: HOLLOW.glimmeringWoods,
      engage: '',
    })
    expect(Object.values(back.enemies)[0]!.damageTaken).toBe(1)
    expect(pursuit(back)).toHaveLength(0)
  })

  it('el reverso del plan sube la oscuridad y lleva a la persecución a los Enemigos de lo Oscuro', () => {
    const game = send(quiet(settle(start(['a', 'b']))), 'stolenLight')
    const dark = at(game, 5, 4)!.id
    const spawned = run(
      dispatch(game, {
        type: 'SpawnEnemy',
        card: stalkingHybrid,
        location: dark,
        engageWith: null,
      }),
    )
    const advanced = run(dispatch(spawned, { type: 'AdvanceAgenda' }))
    expect(darkness(advanced)).toBe(2)
    expect(pursuit(advanced).map((p) => p.card.code)).toContain(HOLLOW.stalkingHybrid)
    // El plan se repite.
    expect(advanced.agendas[advanced.agendaIndex]?.code).toBe(HOLLOW.deepeningDark)
  })
})

describe('La hondonada retorcida: resoluciones', () => {
  const notes = (state: GameState) => state.campaignLog?.notes ?? []
  it('R1: Bertie fue rescatado; R3 explora el Bosque oriental', () => {
    const game = send(quiet(settle(start(['a', 'b']))), 'resolution', { r: 1 })
    expect(notes(game)).toContain('hemlockValeBertieWasRescued')
    expect(game.campaignLog?.valley?.areasSurveyed).toContain('westernWoods')
  })
  it('sin resolución, Bertie se perdió en el bosque', () => {
    const game = send(quiet(settle(start(['a', 'b']))), 'resolution', { r: 0 })
    expect(notes(game)).toContain('hemlockValeBertieWasLost')
  })
})
