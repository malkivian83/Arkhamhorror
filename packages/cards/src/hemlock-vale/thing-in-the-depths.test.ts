import {
  createGame,
  dispatch,
  emptyCampaignLog,
  newValley,
  scenarioBehavior,
  type GameState,
} from '@lcg/engine'
import { choose, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { HEATH } from './silent-heath'
import {
  CENTER,
  chelydranHybrid,
  CRANBERRY_BOG,
  DEPTHS,
  isSunken,
  NORTH_SHORE,
  sinkholes,
  STARTING,
  THING_IN_THE_DEPTHS,
  thingInTheDepthsScenario,
} from './thing-in-the-depths'
import { RESIDENTS } from './welcome'

const players = ['a', 'b']
const log = (time: 'day' | 'night' = 'day', day: 1 | 2 | 3 = 1) => ({
  ...emptyCampaignLog(players),
  valley: { ...newValley(), day, time },
})
const start = (time: 'day' | 'night' = 'day', day: 1 | 2 | 3 = 1) =>
  throughSetup(
    createGame({
      seed: 4,
      scenario: thingInTheDepthsScenario({
        difficulty: 'standard',
        seed: 4,
        investigators: players,
        log: log(time, day),
      }),
      investigators: players.map((id) => testInvestigator(id)),
      campaignLog: log(time, day),
    }),
  )
/** Resuelve solo las preguntas de la preparación. */
const settle = (state: GameState): GameState => {
  let next = state
  while (
    next.pending &&
    ['prompt.hemlockVale.takeControl', 'prompt.hemlockVale.stuckTruck', 'prompt.story'].includes(
      next.pending.question.prompt,
    )
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
const at = (state: GameState, p: [number, number]) =>
  Object.values(state.locations).find((l) => l.position?.[0] === p[0] && l.position[1] === p[1])!
const behavior = () => scenarioBehavior(THING_IN_THE_DEPTHS)!

// Guía, pp. 27–28.
describe('La cosa de las profundidades: preparación', () => {
  it('forma una cuadrícula de 3×3 con 9 de los 10 Lugares y empieza abajo a la izquierda', () => {
    const game = settle(start())
    expect(Object.keys(game.locations)).toHaveLength(9)
    for (let x = 1; x <= 3; x++) for (let y = 1; y <= 3; y++) expect(at(game, [x, y])).toBeDefined()
    expect(game.investigators.every((i) => i.location === at(game, STARTING).id)).toBe(true)
    // Adyacencia por cuadrícula: el centro conecta con los cuatro lados.
    expect(at(game, CENTER).connections).toHaveLength(4)
    expect(game.setAside.filter((c) => c.code === DEPTHS.graspingTendril)).toHaveLength(5)
  })

  it('el Día 1, Judith en la Orilla norte y la Dra. Marquez bajo control; el Día 2, River', () => {
    const first = settle(start())
    expect(
      Object.values(first.placedAssets ?? {}).map((a) =>
        a.placement.type === 'location' ? [a.code, a.placement.location] : [],
      ),
    ).toEqual([[RESIDENTS.judithPark.code, at(first, NORTH_SHORE).id]])
    expect(Object.values(first.assets).map((a) => a.code)).toContain(HEATH.drRosaMarquez)
    const second = settle(start('day', 2))
    expect(Object.values(second.placedAssets ?? {}).map((a) => a.code)).toEqual([
      RESIDENTS.riverHawthorne.code,
    ])
    // Día 2: el plan empieza con 1 de perdición.
    expect(second.doom).toBe(1)
  })
})

describe('La cosa de las profundidades: socavones', () => {
  it('con 3 socavones, el Lugar pasa a Aguas abiertas (velo 5) y conserva sus pistas', () => {
    const game = quiet(settle(start()))
    const target = at(game, CENTER)
    const two = send(game, 'sinkhole', { location: target.id, amount: 2 })
    expect(sinkholes(two, target.id)).toBe(2)
    expect(isSunken(two, target.id)).toBe(false)
    const sunk = send(two, 'sinkhole', { location: target.id, amount: 1 })
    expect(isSunken(sunk, target.id)).toBe(true)
    expect(sinkholes(sunk, target.id)).toBe(0)
    expect(sunk.locations[target.id]!.shroud).toBe(5)
    expect(sunk.locations[target.id]!.clues).toBe(target.clues)
    expect(sunk.locations[target.id]!.shownCode).toMatch(/b$/)
  })

  it('al terminar el turno en un Lugar Ciénaga se colocan 2 socavones con 1 o 2 investigadores', () => {
    const game = quiet(settle(start()))
    const here = at(game, STARTING).id
    const ended = run(
      dispatch(game, { type: 'Forced', trigger: { type: 'turnEnds', investigator: 'a' } }),
    )
    expect(sinkholes(ended, here)).toBe(2)
  })

  it('el reverso del plan 1 hunde el centro y hace aparecer la Cosa en él', () => {
    const game = send(quiet(settle(start())), 'nearMiss')
    const center = at(game, CENTER)
    expect(isSunken(game, center.id)).toBe(true)
    const thing = Object.values(game.enemies).find((e) => e.code === DEPTHS.thingInTheDepths)!
    expect(thing.location).toBe(center.id)
    // Al moverse, la Cosa está conectada a cada Lugar Hundido.
    const other = at(game, CRANBERRY_BOG).id
    const both = send(game, 'sink', { location: other })
    expect(behavior().enemyConnections!(both, center.id, thing)).toContain(other)
  })
})

describe('La cosa de las profundidades: Híbrido chelydra', () => {
  it('el reverso del acto 1 lo hace aparecer en la Orilla norte con un Tentáculo adyacente', () => {
    const game = send(quiet(settle(start())), 'wiseMound')
    const hybrid = Object.values(game.enemies).find((e) => e.code === DEPTHS.chelydranHybrid)!
    expect(hybrid.location).toBe(at(game, NORTH_SHORE).id)
    const tendril = Object.values(game.enemies).find((e) => e.code === DEPTHS.graspingTendril)!
    expect(game.locations[hybrid.location]!.connections).toContain(tendril.location)
    // Los otros 4 Tentáculos vuelven al mazo de Encuentros.
    expect(game.encounterDeck.filter((c) => c.code === DEPTHS.graspingTendril)).toHaveLength(4)
  })

  it('no se mueve con una Abominación preparada en su Lugar', () => {
    const game = send(quiet(settle(start())), 'wiseMound')
    const hybrid = Object.values(game.enemies).find((e) => e.code === DEPTHS.chelydranHybrid)!
    const withThing = run(
      dispatch(game, {
        type: 'SpawnEnemy',
        card: { ...chelydranHybrid, code: DEPTHS.graspingTendril, traits: ['Abomination'] },
        location: hybrid.location,
        engageWith: null,
      }),
    )
    expect(behavior().cannotMoveEnemy!(withThing, hybrid)).toBe(true)
  })
})

describe('La cosa de las profundidades: resoluciones', () => {
  const notes = (state: GameState) => state.campaignLog?.notes ?? []
  it('R2 (el Híbrido vivió) y R5 exploran la Ciénaga de Eastwick', () => {
    const game = send(quiet(settle(start())), 'resolution', { r: 2 })
    expect(notes(game)).toContain('hemlockValeChelydranHybridLived')
    expect(game.campaignLog?.valley?.areasSurveyed).toContain('eastwickBog')
  })
  it('R3: el Híbrido fue devorado y cada investigador sufre 1 trauma mental', () => {
    const game = send(quiet(settle(start())), 'resolution', { r: 3 })
    expect(notes(game)).toContain('hemlockValeChelydranHybridWasDevoured')
    expect(Object.values(game.campaignLog!.investigators).every((i) => i.mentalTrauma === 1)).toBe(
      true,
    )
  })
})
