import { createGame, getInvestigator, type EnemyCard, type GameState } from '@lcg/engine'
import { choose, during, labels, withBag } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { CODES, spreadingFlames } from '../brethren-of-ash/spreading-flames'
import { code, playerCards, STARTER_DECKS, starterInvestigator } from './player-cards'

const DANIELA = code(1)
const inv = (s: GameState) => getInvestigator(s, DANIELA)
const assets = (s: GameState) => Object.values(s.assets)
const ROOM = CODES.yourFriendsRoom

function newGame(): GameState {
  return createGame({
    seed: 5,
    scenario: spreadingFlames(),
    investigators: [starterInvestigator('daniela')],
  })
}

/** Abre el menú de Daniela con la mano y recursos indicados. */
const withHand =
  (hand: number[], resources = 10) =>
  (s: GameState) => ({
    ...s,
    investigators: s.investigators.map((i) => ({ ...i, hand: hand.map(code), resources })),
  })
const cultist: EnemyCard = {
  kind: 'enemy',
  code: 'test-cultist',
  name: 'Cultist',
  fight: 3,
  health: 3,
  evade: 3,
  damage: 1,
  horror: 0,
  keywords: [],
}

describe('caja básica 2026: datos', () => {
  it('104 cartas de jugador y 5 investigadores', () => {
    expect(playerCards).toHaveLength(104)
    expect(playerCards.filter((c) => c.type === 'investigator').map((c) => c.name)).toEqual([
      'Daniela Reyes',
      'Joe Diamond',
      'Trish Scarborough',
      'Dexter Drake',
      'Isabelle Barnes',
    ])
  })

  it('cada mazo inicial tiene 30 cartas, su carta exclusiva y 2 debilidades', () => {
    for (const key of Object.keys(STARTER_DECKS)) {
      expect(starterInvestigator(key).deck, key).toHaveLength(33)
    }
  })

  it('Daniela empieza con sus valores', () => {
    expect(starterInvestigator('daniela')).toMatchObject({
      name: 'Daniela Reyes',
      skills: { willpower: 3, intellect: 2, combat: 5, agility: 2 },
      health: 9,
      sanity: 5,
    })
  })
})

describe('jugar cartas', () => {
  it('evento: Emergency Cache cuesta una acción, da 3 recursos y va al descarte', () => {
    let game = during(newGame(), withHand([89], 0))
    game = choose(game, 'action.play', { card: 'Emergency Cache' })
    expect(inv(game)).toMatchObject({ resources: 3, actionsRemaining: 2, hand: [] })
    expect(inv(game).discard).toEqual([code(89)])
  })

  it('apoyo: se paga su coste y entra en juego', () => {
    let game = during(newGame(), withHand([20], 5))
    game = choose(game, 'action.play', { card: 'Machete' })
    expect(inv(game).resources).toBe(2)
    expect(assets(game).map((a) => a.code)).toEqual([code(20)])
  })

  it('no se puede jugar sin recursos suficientes', () => {
    const game = during(newGame(), withHand([20], 2))
    expect(labels(game)).not.toContain('action.play')
  })

  it('ranuras: un tercer apoyo de mano obliga a descartar uno', () => {
    let game = during(newGame(), withHand([20, 86, 88], 10))
    game = choose(game, 'action.play', { card: 'Machete' })
    game = choose(game, 'action.play', { card: 'Broken Bottle' })
    game = choose(game, 'action.play', { card: 'Hand-Crank Flashlight' })
    expect(game.pending?.question.prompt).toBe('prompt.freeSlot')
    game = choose(game, 'choice.discard', { card: 'Machete' })
    expect(
      assets(game)
        .map((a) => a.code)
        .sort(),
    ).toEqual([code(86), code(88)].sort())
    expect(inv(game).discard).toContain(code(20))
  })

  it('evento rápido: Working a Hunch no gasta acción', () => {
    let game = during(newGame(), withHand([38], 2))
    game = choose(game, 'action.playFast', { card: 'Working a Hunch' })
    expect(inv(game)).toMatchObject({ clues: 1, actionsRemaining: 3 })
  })
})

describe('habilidades de apoyos', () => {
  it('Machete: +1 [combat] y +1 daño contra el único enemigo enfrentado', () => {
    let game = during(newGame(), withHand([20], 5), {
      type: 'SpawnEnemy',
      card: cultist,
      location: ROOM,
      engageWith: null,
    })
    game = choose(game, 'action.play', { card: 'Machete' })
    // combate 5 + 1, ficha −3 → 3 contra combate 3 del enemigo: éxito, 2 daño.
    game = during(game, withBag(-3))
    game = choose(game, 'ability.fightWith', { card: 'Machete' })
    expect(Object.values(game.enemies)[0]?.damageTaken).toBe(2)
  })

  it('Hand-Crank Flashlight: tras investigar con éxito, descartarla baja el velo hasta el final de la ronda', () => {
    let game = during(newGame(), (s) => withBag(0)(withHand([88], 5)(s)))
    game = choose(game, 'action.play', { card: 'Hand-Crank Flashlight' })
    game = choose(game, 'ability.investigateWith', { card: 'Hand-Crank Flashlight' })
    game = choose(game, 'choice.discardForShroud', { card: 'Hand-Crank Flashlight' })
    expect(game.locations[ROOM]?.shroudModifier).toBe(-1)
    expect(assets(game)).toHaveLength(0)
    expect(inv(game).discard).toContain(code(88))
    game = during(game, (s) => s, { type: 'EndOfRound' })
    expect(game.locations[ROOM]?.shroudModifier).toBeUndefined()
  })

  it('M1911: gasta munición en cada ataque', () => {
    let game = during(newGame(), (s) => withBag(0)(withHand([19], 5)(s)), {
      type: 'SpawnEnemy',
      card: { ...cultist, health: 9 },
      location: ROOM,
      engageWith: null,
    })
    game = choose(game, 'action.play', { card: 'M1911' })
    game = choose(game, 'ability.fightWith', { card: 'M1911' })
    expect(assets(game)[0]?.uses).toBe(3)
    expect(Object.values(game.enemies)[0]?.damageTaken).toBe(2)
  })
})

describe('comprometer cartas a pruebas', () => {
  it('Overpower suma sus iconos y roba 1 carta si la prueba tiene éxito', () => {
    // combate 5 + 2 (Overpower), ficha −4 → 3 contra 3: éxito.
    let game = during(newGame(), (s) => withBag(-4)(withHand([92], 0)(s)), {
      type: 'SpawnEnemy',
      card: cultist,
      location: ROOM,
      engageWith: null,
    })
    game = choose(game, 'action.fight', { enemy: 'Cultist' })
    expect(game.pending?.question.prompt).toBe('prompt.commitCards')
    game = choose(game, 'choice.commit', { card: 'Overpower' })
    // Máximo 1 comprometida: ya no se ofrece otra y se pasa a revelar ficha.
    expect(Object.values(game.enemies)[0]?.damageTaken).toBe(1)
    expect(inv(game).hand).toHaveLength(1) // robó 1
    expect(inv(game).discard).toEqual([code(92)])
  })

  it('otro investigador en la misma localización compromete 1 carta como máximo', () => {
    const JOE = starterInvestigator('joe').id
    let game = createGame({
      seed: 5,
      scenario: spreadingFlames(),
      investigators: [starterInvestigator('daniela'), starterInvestigator('joe')],
    })
    if (game.pending?.question.prompt === 'prompt.chooseNextInvestigator') {
      game = choose(game, 'choice.investigator', { name: 'Daniela Reyes' })
    }
    // Daniela investiga sin cartas; Joe (en la misma localización) tiene Perception y Deduction.
    game = during(game, (s) =>
      withBag(0)({
        ...s,
        investigators: s.investigators.map((i) => ({
          ...i,
          hand: i.id === JOE ? [code(93), code(39)] : [],
        })),
      }),
    )
    game = choose(game, 'action.investigate')
    expect(game.pending?.question.prompt).toBe('prompt.commitCards')
    game = choose(game, 'choice.commitFrom', { name: 'Joe Diamond', card: 'Perception' })
    // Joe ya ha comprometido una carta: no se le ofrece Deduction y la prueba se resuelve.
    expect(labels(game)).not.toContain('choice.commitFrom')
    const joe = getInvestigator(game, JOE)
    // Perception: si la prueba tiene éxito, quien la comprometió (Joe) roba 1 carta.
    expect(joe.hand).toHaveLength(2)
    expect(joe.hand).toContain(code(39))
    expect(joe.discard).toContain(code(93))
    expect(inv(game).clues).toBe(1)
  })

  it('las cartas sin iconos de la habilidad no se pueden comprometer', () => {
    let game = during(newGame(), (s) => withBag(0)(withHand([94 - 2], 0)(s)))
    game = choose(game, 'action.investigate')
    // Overpower solo tiene combate: investigar no abre la ventana de comprometer.
    expect(game.pending?.question.prompt).toBe('prompt.chooseAction')
  })
})

describe('asignar daño a apoyos', () => {
  it('el jugador elige si el daño va al investigador o a un apoyo con salud', () => {
    let game = during(newGame(), withHand([16], 5))
    game = choose(game, 'action.play', { card: 'Bodyguard' })
    game = during(game, (s) => s, {
      type: 'TakeDamage',
      investigator: DANIELA,
      damage: 1,
      horror: 0,
    })
    expect(game.pending?.question.prompt).toBe('prompt.assignDamage')
    game = choose(game, 'choice.assignToAsset', { card: 'Bodyguard' })
    expect(inv(game).damage).toBe(0)
    expect(assets(game)[0]?.damage).toBe(1)
  })

  it('el daño directo va siempre al investigador', () => {
    let game = during(newGame(), withHand([16], 5))
    game = choose(game, 'action.play', { card: 'Bodyguard' })
    game = during(game, (s) => s, {
      type: 'TakeDamage',
      investigator: DANIELA,
      damage: 1,
      horror: 0,
      direct: true,
    })
    expect(inv(game).damage).toBe(1)
  })
})

describe('registro de partida', () => {
  it('anota rondas, fases, acciones y pruebas', () => {
    let game = during(newGame(), (s) => withBag(0)(withHand([])(s)))
    game = choose(game, 'action.investigate')
    const keys = game.log.map((e) => e.key)
    expect(keys).toEqual(
      expect.arrayContaining(['log.round', 'log.phase', 'log.action.investigate']),
    )
    expect(keys.some((k) => k === 'log.testSuccess' || k === 'log.testFailure')).toBe(true)
  })
})
