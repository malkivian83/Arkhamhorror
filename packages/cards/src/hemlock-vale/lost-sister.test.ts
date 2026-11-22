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
import {
  cavernsDeck,
  crustaceanLight,
  isDark,
  limulusLight,
  LOST_SISTER,
  lostSister,
  SISTER,
} from './lost-sister'
import { nightAt } from './vale-time'
import { RESIDENTS } from './welcome'

const players = ['a', 'b']
const log = (time: 'day' | 'night' = 'day', day: 1 | 2 | 3 = 1) => ({
  ...emptyCampaignLog(players),
  valley: { ...newValley(), day, time },
})
const start = (time: 'day' | 'night' = 'day', day: 1 | 2 | 3 = 1) =>
  throughSetup(
    createGame({
      seed: 12,
      scenario: lostSister({
        difficulty: 'standard',
        seed: 12,
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
  for (let n = 0; next.pending && n < 60; n++)
    next = choose(next, next.pending.question.choices[0]!.label)
  return next
}
const send = (state: GameState, key: string, data: Record<string, string | number> = {}) =>
  run(dispatch(state, { type: 'ScenarioSpecific', key, data }))
const behavior = () => scenarioBehavior(LOST_SISTER)!
/** Resuelve solo las preguntas de la preparación (quién controla a cada habitante). */
const settle = (state: GameState): GameState => {
  let next = state
  while (next.pending?.question.prompt === 'prompt.hemlockVale.takeControl')
    next = choose(next, next.pending.question.choices[0]!.label)
  return next
}
const cavernAt = (state: GameState, x: number, y: number) =>
  Object.values(state.locations).find((l) => l.position?.[0] === x && l.position[1] === y)
const spawn = (state: GameState, card = crustaceanLight, location = SISTER.akwan) =>
  run(dispatch(state, { type: 'SpawnEnemy', card, location, engageWith: null }))
const hybrid = (state: GameState) =>
  Object.values(state.enemies).find(
    (e) => e.code.startsWith('10584') || e.code.startsWith('10583'),
  )!

// Guía, p. 24.
describe('La hermana perdida: preparación', () => {
  it('pone Akwan y tres Cavernas sin revelar a los lados y debajo; el resto forma el mazo', () => {
    const game = start()
    expect(game.scenarioId).toBe(LOST_SISTER)
    expect(game.investigators.every((i) => i.location === SISTER.akwan)).toBe(true)
    for (const [x, y] of [
      [5, 6],
      [6, 7],
      [7, 6],
    ]) {
      const l = cavernAt(game, x!, y!)!
      expect(l.revealed).toBe(false)
      expect(game.locations[SISTER.akwan]!.connections).toContain(l.id)
    }
    // 8 Lugares de La hermana perdida + 4 Cuevas (6 − 2), menos los 3 en juego.
    expect(cavernsDeck(game)).toHaveLength(9)
    expect(game.setAsideLocations[SISTER.fungalCave]).toBeDefined()
    expect(game.setAside.map((c) => c.code).sort()).toEqual(
      [
        '10721',
        '10721',
        SISTER.crustaceanLight,
        SISTER.crustaceanLight,
        SISTER.limulusLight,
      ].sort(),
    )
  })

  it('de día Helen y Theo (Día 1) quedan bajo control; de noche, solo Helen', () => {
    const owned = (state: GameState) => Object.values(state.assets).map((a) => a.code)
    const day = settle(start())
    expect(owned(day)).toEqual(
      expect.arrayContaining([SISTER.helenPeters, RESIDENTS.theoPeters.code]),
    )
    const night = settle(start('night'))
    expect(owned(night)).toContain(SISTER.helenPeters)
    expect(owned(night)).not.toContain(RESIDENTS.theoPeters.code)
    const third = settle(start('day', 3))
    expect(owned(third)).toContain(RESIDENTS.gideonMizrah.code)
    expect(Object.values(third.placedAssets ?? {}).map((a) => a.code)).toContain(
      RESIDENTS.williamHemlock.code,
    )
  })
})

describe('La hermana perdida: Lugares Oscuros', () => {
  it('las cartas de un Lugar Oscuro usan sus efectos de Noche, aunque sea de día', () => {
    const game = quiet(start())
    const cavern = cavernAt(game, 6, 7)!
    expect(isDark(game, cavern.id)).toBe(true)
    expect(nightAt(game, cavern.id)).toBe(true)
    expect(nightAt(game, SISTER.akwan)).toBe(false)
    // De noche, Akwan sigue siendo de Día: el Indicador de tiempo no cuenta.
    expect(nightAt(quiet(start('night')), SISTER.akwan)).toBe(false)
  })

  it('la Cueva abierta iluminada deja de ser Oscura', () => {
    const game = quiet(start())
    const cavern = cavernAt(game, 6, 7)!
    const lit = { ...game, scenarioMeta: { ...game.scenarioMeta, [`lit:${cavern.id}`]: 1 } }
    expect(isDark(lit, cavern.id)).toBe(false)
  })

  it('Helen da +1 [combat] fuera de lo Oscuro y +1 [agility] en lo Oscuro', () => {
    const game = settle(start('night'))
    const owner = Object.values(game.assets).find((a) => a.code === SISTER.helenPeters)!.owner
    const test = (skill: string) =>
      ({ investigator: owner, skill }) as unknown as Parameters<
        NonNullable<ReturnType<typeof behavior>['skillModifier']>
      >[1]
    expect(behavior().skillModifier!(game, test('combat'))).toBe(1)
    expect(behavior().skillModifier!(game, test('agility'))).toBe(0)
    const dark = cavernAt(game, 6, 7)!.id
    const moved = {
      ...game,
      investigators: game.investigators.map((i) => (i.id === owner ? { ...i, location: dark } : i)),
    }
    expect(behavior().skillModifier!(moved, test('agility'))).toBe(1)
  })
})

describe('La hermana perdida: Enemigos de doble cara', () => {
  it('el Híbrido crustáceo se da la vuelta en un Lugar Oscuro y conserva su daño', () => {
    const game = quiet(start())
    const dark = cavernAt(game, 6, 7)!.id
    const atAkwan = spawn(game)
    const light = hybrid(atAkwan)
    expect(light.code).toBe(SISTER.crustaceanLight)
    const hurt = {
      ...atAkwan,
      enemies: { ...atAkwan.enemies, [light.id]: { ...light, damageTaken: 1 } },
    }
    const investigators = hurt.investigators.map((i) => ({ ...i, location: dark }))
    const moved = run(
      dispatch({ ...hurt, investigators }, { type: 'MoveEnemy', enemy: light.id, location: dark }),
    )
    const flipped = moved.enemies[light.id]!
    expect(flipped.code).toBe(SISTER.crustaceanDark)
    expect(flipped.damageTaken).toBe(1)
    // Obligado: al pasar a este lado, 1 daño a cada investigador de su Lugar.
    expect(moved.investigators.every((i) => i.damage === 1)).toBe(true)
  })

  it('a la luz, el crustáceo reduce a 1 el daño de los ataques y el límulo gana salud', () => {
    const crab = scenarioBehavior(LOST_SISTER)
    expect(crab).toBeDefined()
    const game = spawn(quiet(start()), limulusLight)
    const limulus = hybrid(game)
    expect(limulus.code).toBe(SISTER.limulusLight)
    // A la luz: 1 daño por investigador al darse la vuelta a este lado (aquí aparece así).
    expect(limulus.noOpportunityAttacks).toBe(true)
  })
})

describe('La hermana perdida: mazo de Cavernas y actos', () => {
  it('descubrir la última pista de una Cueva pone la siguiente Caverna adyacente', () => {
    const game = quiet(start())
    const below = cavernAt(game, 6, 7)!.id
    const deck = cavernsDeck(game)
    const placed = send(game, 'placeCavern', { location: below })
    expect(cavernsDeck(placed)).toHaveLength(deck.length - 1)
    const added = placed.locations[deck[0]!]!
    const [x, y] = added.position!
    expect(Math.abs(x - 6) + Math.abs(y - 7)).toBe(1)
  })

  it('con la correa y las huellas avanza el acto 1 y entra la Cueva fúngica', () => {
    const game = quiet(start())
    const found = {
      ...game,
      scenarioMeta: { ...game.scenarioMeta, foundLeash: 1, foundFootprints: 1 },
    }
    const advanced = run(dispatch(found, { type: 'Forced', trigger: { type: 'roundEnds' } }))
    expect(advanced.actIndex).toBe(1)
    const fungal = advanced.locations[SISTER.fungalCave]!
    expect(fungal).toBeDefined()
    const neighbours = Object.values(advanced.locations).filter(
      (l) =>
        l.id !== fungal.id &&
        Math.abs(l.position![0] - fungal.position![0]) +
          Math.abs(l.position![1] - fungal.position![1]) ===
          1,
    )
    expect(neighbours.length).toBe(4)
  })
})

describe('La hermana perdida: resoluciones', () => {
  const resolve = (state: GameState, r: number) => send(quiet(state), 'resolution', { r })
  const notes = (state: GameState) => state.campaignLog?.notes ?? []

  it('R1 sin reconciliación: Elizabeth Peters fue salvada; R4 explora la Costa de Akwan', () => {
    const game = resolve(start(), 1)
    expect(notes(game)).toContain('hemlockValeElizabethPetersSaved')
    expect(game.campaignLog?.valley?.areasSurveyed).toContain('akwanShoreline')
  })

  it('con Theo reconciliado, la familia Peters se reúne; Gideon encuentra su tesoro', () => {
    const base = start()
    const reconciled = {
      ...base,
      campaignLog: {
        ...base.campaignLog!,
        valley: {
          ...base.campaignLog!.valley!,
          residents: {
            ...base.campaignLog!.valley!.residents,
            theoPeters: {
              ...base.campaignLog!.valley!.residents.theoPeters,
              notes: ['theoReconciledWithHelen'],
            },
          },
        },
      },
      scenarioMeta: { ...base.scenarioMeta, gideonSearching: 1 },
      investigators: base.investigators.map((i) => ({ ...i, clues: 1 })),
    }
    const game = resolve(reconciled, 1)
    expect(notes(game)).toContain('hemlockValePetersFamilyReunited')
    expect(game.campaignLog?.valley?.residents.gideonMizrah.notes).toContain(
      'gideonFoundHisTreasure',
    )
  })
})
