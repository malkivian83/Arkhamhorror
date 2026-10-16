import {
  createGame,
  getInvestigator,
  slotCapacity,
  type EnemyCard,
  type GameState,
} from '@lcg/engine'
import { choose, during, labels, testInvestigator, withBag } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { CODES, spreadingFlames } from '../brethren-of-ash/spreading-flames'
import '../index'
import { code, starterInvestigator } from './player-cards'

const DANIELA = code(1)
const ROOM = CODES.yourFriendsRoom
const inv = (s: GameState) => getInvestigator(s, DANIELA)
const enemies = (s: GameState) => Object.values(s.enemies)

const cultist: EnemyCard = {
  kind: 'enemy',
  code: 'test-cultist',
  name: 'Cultist',
  fight: 3,
  health: 4,
  evade: 3,
  damage: 1,
  horror: 1,
  keywords: [],
}

function newGame(): GameState {
  return createGame({
    seed: 5,
    scenario: spreadingFlames(),
    investigators: [starterInvestigator('daniela')],
  })
}

const withHand =
  (hand: number[], resources = 10) =>
  (s: GameState) => ({
    ...s,
    investigators: s.investigators.map((i) => ({ ...i, hand: hand.map(code), resources })),
  })

/** Daniela puede contraatacar tras un ataque de oportunidad: aquí se pasa. */
const pass = (s: GameState) =>
  labels(s).includes('ability.danielaFight') ? choose(s, 'choice.skip') : s

const spawn = (engageWith: string | null = null) =>
  ({ type: 'SpawnEnemy', card: cultist, location: ROOM, engageWith }) as const

describe('cartas permanentes', () => {
  it('Studious, Another Day, Another Dollar y Charisma empiezan en juego y dan su ventaja', () => {
    const game = createGame({
      seed: 2,
      scenario: spreadingFlames(),
      investigators: [
        testInvestigator('a', {
          deck: [
            code(42),
            code(56),
            code(95),
            ...Array.from({ length: 20 }, (_, n) => `a-card-${n}`),
          ],
        }),
      ],
    })
    const a = getInvestigator(game, 'a')
    expect(a.hand).toHaveLength(6)
    expect(a.resources).toBe(7)
    expect(a.deck.some((c) => [code(42), code(56), code(95)].includes(c))).toBe(false)
    expect(
      Object.values(game.assets)
        .map((x) => x.code)
        .sort(),
    ).toEqual([code(42), code(56), code(95)].sort())
    expect(slotCapacity(game, 'a', 'ally')).toBe(2)
    expect(slotCapacity(game, 'a', 'accessory')).toBe(1)
  })
})

describe('ataques', () => {
  it('Decisive Strike: si derrota al enemigo, gana 5 recursos', () => {
    // combate 5 + 2 = 7 contra 3; 2 daño contra 2 de salud.
    let game = during(newGame(), (s) => withBag(0)(withHand([55], 2)(s)), {
      ...spawn(),
      card: { ...cultist, health: 2 },
    })
    game = choose(game, 'action.play', { card: 'Decisive Strike' })
    expect(enemies(game)).toHaveLength(0)
    expect(inv(game).resources).toBe(5)
  })

  it('Winchester Model 12: +1 daño por cada punto de éxito (máx. +4)', () => {
    let game = during(newGame(), (s) => withBag(0)(withHand([29], 10)(s)), {
      ...spawn(),
      card: { ...cultist, health: 9 },
    })
    game = pass(choose(game, 'action.play', { card: 'Winchester Model 12' }))
    game = choose(game, 'ability.fightWith', { card: 'Winchester Model 12' })
    // combate 5 + 3 = 8 contra 3: éxito por 5 → 1 + 4 (máximo) = 5 daño.
    expect(enemies(game)[0]?.damageTaken).toBe(5)
    expect(Object.values(game.assets)[0]?.uses).toBe(2)
  })
})

describe('reacciones y pruebas', () => {
  it('Counterattack cancela el ataque del enemigo y le hace 1 daño', () => {
    let game = during(newGame(), withHand([26], 5), spawn(DANIELA))
    game = choose(game, 'action.draw')
    // Robar provoca un ataque de oportunidad: antes de resolverlo se puede jugar Counterattack.
    game = choose(game, 'ability.playCard', { card: 'Counterattack' })
    expect(inv(game)).toMatchObject({ damage: 0, horror: 0 })
    expect(enemies(game)[0]?.damageTaken).toBe(1)
  })

  it('Scrape By: la prueba que iba a fallar se supera por 0', () => {
    // Intelecto 2 − 4 contra velo 2: falla; con Scrape By, éxito y 1 pista.
    let game = during(newGame(), (s) => withBag(-4)(withHand([82], 5)(s)))
    game = choose(game, 'action.investigate')
    game = choose(game, 'choice.revealToken')
    expect(labels(game)).toContain('ability.playCard')
    game = choose(game, 'ability.playCard', { card: 'Scrape By' })
    expect(inv(game).clues).toBe(1)
    expect(inv(game).horror).toBe(0)
  })

  it('Mask of Silenus: revela 2 fichas y se elige cuál resolver', () => {
    let game = during(newGame(), (s) => withBag(-8, 1)(withHand([68], 5)(s)))
    game = choose(game, 'action.play', { card: 'Mask of Silenus' })
    game = choose(game, 'action.investigate')
    game = choose(game, 'ability.revealExtraToken', { card: 'Mask of Silenus' })
    expect(game.pending?.question.prompt).toBe('prompt.chooseToken')
    game = choose(game, 'choice.resolveToken', { token: '1' })
    expect(inv(game).clues).toBe(1)
    // Las dos fichas vuelven a la bolsa al terminar.
    expect(game.chaosBag.sort()).toEqual([-8, 1].sort())
  })

  it('On the Brink: si falla, las demás cartas comprometidas vuelven a la mano', () => {
    // Intelecto 2 + 2 (On the Brink) + 2 (Perception) − 8 contra 2: falla.
    let game = during(newGame(), (s) => withBag(-8)(withHand([84, 93], 0)(s)))
    const deck = inv(game).deck.length
    game = choose(game, 'action.investigate')
    game = choose(game, 'choice.commit', { card: 'On the Brink' })
    game = choose(game, 'choice.commit', { card: 'Perception' })
    expect(inv(game).hand).toContain(code(93))
    expect(inv(game).discard).toEqual([code(84)])
    expect(inv(game).deck).toHaveLength(deck - 1) // roba 1
  })
})
