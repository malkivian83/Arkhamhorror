import { describe, expect, it } from 'vitest'
import { applyInput, createGame } from './engine'
import { EngineError } from './errors'
import { shuffle } from './rng'
import { getInvestigator } from './state'
import {
  choose,
  during,
  ghoul,
  keep,
  labels,
  newTestGame,
  spawnAt,
  testInvestigator,
  testScenario,
  withBag,
} from './testing'
import type { GameState } from './types'

const inv = (s: GameState, id = 'a') => getInvestigator(s, id)
const enemies = (s: GameState) => Object.values(s.enemies)

/** Gasta las acciones restantes del turno ganando recursos. */
function spendTurn(s: GameState): GameState {
  let state = s
  for (let n = 0; n < 3; n++) state = choose(state, 'action.resource')
  return state
}

describe('preparación (RR "Setting Up a Game")', () => {
  it('5 recursos, 5 cartas, en la localización inicial revelada con sus pistas', () => {
    const game = newTestGame({ players: ['a', 'b'] })
    for (const id of ['a', 'b']) {
      expect(inv(game, id).resources).toBe(5)
      expect(inv(game, id).hand).toHaveLength(5)
      expect(inv(game, id).deck).toHaveLength(15)
      expect(inv(game, id).location).toBe('A')
    }
    expect(game.locations.A).toMatchObject({ revealed: true, clues: 4 })
    expect(game.locations.B?.revealed).toBe(false)
  })

  it('la primera ronda empieza en investigación, sin fase de mitos', () => {
    const game = newTestGame()
    expect(game.round).toBe(1)
    expect(game.phase).toBe('investigation')
    expect(game.doom).toBe(0)
    expect(game.pending?.question.prompt).toBe('prompt.chooseAction')
  })

  it('con varios investigadores, el grupo elige quién juega primero', () => {
    const game = newTestGame({ players: ['a', 'b'] })
    expect(game.pending?.question.prompt).toBe('prompt.chooseNextInvestigator')
    const second = choose(game, 'choice.investigator', { name: 'B' })
    expect(second.pending?.investigator).toBe('b')
    expect(inv(second, 'b').actionsRemaining).toBe(3)
  })

  it('valida jugadores repetidos y número de jugadores', () => {
    const scenario = testScenario()
    expect(() => createGame({ seed: 1, scenario, investigators: [] })).toThrow(EngineError)
    expect(() =>
      createGame({
        seed: 1,
        scenario,
        investigators: [testInvestigator('a'), testInvestigator('a')],
      }),
    ).toThrow(EngineError)
  })
})

describe('ronda completa', () => {
  it('investigación → enemigos → mantenimiento → mitos', () => {
    const afterTurn = spendTurn(newTestGame())
    expect(afterTurn.round).toBe(2)
    expect(afterTurn.phase).toBe('investigation')
    // Mantenimiento: +1 carta y +1 recurso. Turno: +3 recursos.
    expect(inv(afterTurn).resources).toBe(5 + 3 + 1)
    expect(inv(afterTurn).hand).toHaveLength(6)
    // Mitos: 1 perdición y un encuentro que aparece enfrentado.
    expect(afterTurn.doom).toBe(1)
    expect(enemies(afterTurn)).toHaveLength(1)
    expect(enemies(afterTurn)[0]?.engagedWith).toBe('a')
  })

  it('el turno termina solo al gastar 3 acciones', () => {
    let game = newTestGame({ players: ['a', 'b'] })
    game = choose(game, 'choice.investigator', { name: 'A' })
    game = choose(game, 'action.draw')
    game = choose(game, 'action.draw')
    game = choose(game, 'action.draw')
    expect(game.pending?.investigator).toBe('b')
    expect(inv(game).hand).toHaveLength(8)
  })

  it('terminar el turno antes pierde las acciones restantes', () => {
    const game = choose(newTestGame(), 'action.endTurn')
    expect(game.round).toBe(2)
    expect(inv(game).resources).toBe(6)
  })
})

describe('acciones básicas (RR "Types of Actions")', () => {
  it('moverse revela la localización y coloca sus pistas', () => {
    const game = choose(newTestGame(), 'action.move', { location: 'Room B' })
    expect(inv(game).location).toBe('B')
    expect(game.locations.B).toMatchObject({ revealed: true, clues: 1 })
  })

  it('investigar con éxito descubre 1 pista', () => {
    const game = choose(during(newTestGame(), withBag(0)), 'action.investigate')
    expect(inv(game).clues).toBe(1)
    expect(game.locations.A?.clues).toBe(1)
  })

  it('investigar sin éxito no descubre pistas', () => {
    const game = choose(during(newTestGame(), withBag(-2)), 'action.investigate')
    expect(inv(game).clues).toBe(0)
  })

  it('robar con el mazo vacío: 1 horror y se baraja el descarte', () => {
    const game = during(newTestGame(), (s) => ({
      ...s,
      investigators: s.investigators.map((i) => ({ ...i, deck: [], discard: ['x', 'y'] })),
    }))
    const drawn = choose(game, 'action.draw')
    expect(inv(drawn).horror).toBe(1)
    expect(inv(drawn).hand).toHaveLength(6)
    expect(inv(drawn).deck).toHaveLength(1)
    expect(inv(drawn).discard).toHaveLength(0)
  })
})

describe('pruebas de habilidad (RR "Skills and Skill Tests")', () => {
  it('éxito si el valor modificado iguala la dificultad', () => {
    // intelecto 3, ficha -1 → 2 contra velo 2.
    const game = choose(during(newTestGame(), withBag(-1)), 'action.investigate')
    expect(inv(game).clues).toBe(1)
  })

  it('la ficha de fallo automático siempre falla', () => {
    const game = choose(
      during(
        newTestGame({
          investigator: { skills: { willpower: 9, intellect: 9, combat: 9, agility: 9 } },
        }),
        withBag('autoFail'),
      ),
      'action.investigate',
    )
    expect(inv(game).clues).toBe(0)
  })

  it('los símbolos usan los valores del escenario y el signo arcano el del investigador', () => {
    const skull = choose(during(newTestGame(), withBag('skull')), 'action.investigate')
    expect(inv(skull).clues).toBe(1) // 3 - 1 = 2 ≥ 2
    const tablet = choose(during(newTestGame(), withBag('tablet')), 'action.investigate')
    expect(inv(tablet).clues).toBe(0) // 3 - 3 = 0 < 2
    const elder = createGame({
      seed: 1,
      scenario: testScenario({ chaosBag: ['elderSign'] }),
      investigators: [
        testInvestigator('a', {
          skills: { willpower: 1, intellect: 1, combat: 1, agility: 1 },
          elderSignModifier: 1,
        }),
      ],
    })
    expect(inv(choose(elder, 'action.investigate')).clues).toBe(1) // 1 + 1 = 2 ≥ 2
  })

  it('la prueba termina y no deja estado colgado', () => {
    const game = choose(newTestGame(), 'action.investigate')
    expect(game.skillTest).toBeNull()
  })
})

describe('enemigos', () => {
  it('ataques de oportunidad al hacer otra acción que no sea luchar o evadir', () => {
    const game = during(newTestGame(), keep, spawnAt('A'))
    expect(enemies(game)[0]?.engagedWith).toBe('a')
    const drawn = choose(game, 'action.draw')
    expect(inv(drawn)).toMatchObject({ damage: 1, horror: 1 })
    // El ataque de oportunidad no agota al enemigo.
    expect(enemies(drawn)[0]?.exhausted).toBe(false)
  })

  it('luchar no provoca ataques de oportunidad y cada éxito hace 1 daño', () => {
    let game = during(newTestGame(), withBag(0), spawnAt('A'))
    const id = enemies(game)[0]?.id as string
    game = choose(game, 'action.fight', { enemy: 'Ghoul' })
    expect(inv(game).damage).toBe(0)
    expect(game.enemies[id]?.damageTaken).toBe(1)
    game = choose(game, 'action.fight', { enemy: 'Ghoul' })
    expect(game.enemies[id]).toBeUndefined()
    expect(game.encounterDiscard).toHaveLength(1)
  })

  it('los enemigos con victoria van a la zona de victoria', () => {
    let game = during(newTestGame(), withBag(0), spawnAt('A', { ...ghoul, health: 1, victory: 1 }))
    game = choose(game, 'action.fight', { enemy: 'Ghoul' })
    expect(game.victoryDisplay).toEqual(['test-ghoul'])
  })

  it('evadir agota y rompe el enfrentamiento', () => {
    let game = during(newTestGame(), withBag(0), spawnAt('A'))
    game = choose(game, 'action.evade', { enemy: 'Ghoul' })
    expect(enemies(game)[0]).toMatchObject({ engagedWith: null, exhausted: true })
    // Agotado: ya no ataca de oportunidad.
    game = choose(game, 'action.draw')
    expect(inv(game).damage).toBe(0)
  })

  it('represalia: atacar y fallar provoca un ataque', () => {
    let game = during(
      newTestGame(),
      withBag(-3),
      spawnAt('A', { ...ghoul, keywords: ['retaliate'] }),
    )
    game = choose(game, 'action.fight', { enemy: 'Ghoul' })
    expect(inv(game).damage).toBe(1)
  })

  it('alerta: evadir y fallar provoca un ataque', () => {
    let game = during(newTestGame(), withBag(-3), spawnAt('A', { ...ghoul, keywords: ['alert'] }))
    game = choose(game, 'action.evade', { enemy: 'Ghoul' })
    expect(inv(game).damage).toBe(1)
  })

  it('distante: no se enfrenta solo y no se puede atacar sin enfrentarlo', () => {
    let game = during(newTestGame(), keep, spawnAt('A', { ...ghoul, keywords: ['aloof'] }))
    expect(enemies(game)[0]?.engagedWith).toBeNull()
    expect(labels(game)).not.toContain('action.fight')
    game = choose(game, 'action.engage', { enemy: 'Ghoul' })
    expect(enemies(game)[0]?.engagedWith).toBe('a')
    expect(labels(game)).toContain('action.fight')
  })

  it('los enemigos enfrentados acompañan al investigador', () => {
    let game = during(newTestGame(), keep, spawnAt('A'))
    game = choose(game, 'action.move', { location: 'Room B' })
    expect(enemies(game)[0]?.location).toBe('B')
    expect(inv(game).damage).toBe(1) // ataque de oportunidad al moverse
  })

  it('en la fase de enemigos, los enfrentados atacan y se agotan', () => {
    let game = during(newTestGame(), keep, spawnAt('A'))
    game = choose(game, 'action.endTurn')
    // Atacó en la fase de enemigos y se preparó en mantenimiento.
    expect(inv(game)).toMatchObject({ damage: 1, horror: 1 })
  })

  it('cazador: se mueve por el camino más corto y se enfrenta', () => {
    let game = during(newTestGame(), keep, spawnAt('C', { ...ghoul, keywords: ['hunter'] }))
    game = choose(game, 'action.endTurn')
    // Ronda 1: C → B. Ronda 2 (mitos): aparece otro enemigo en A.
    const hunter = enemies(game).find((e) => e.keywords.includes('hunter'))
    expect(hunter?.location).toBe('B')
    game = choose(game, 'action.endTurn')
    const moved = enemies(game).find((e) => e.keywords.includes('hunter'))
    expect(moved?.location).toBe('A')
    expect(moved?.engagedWith).toBe('a')
  })

  it('aparece en su localización si tiene instrucciones de aparición', () => {
    let game = during(
      newTestGame({ scenario: { encounterDeck: [{ ...ghoul, spawnAt: 'C' }] } }),
      keep,
    )
    game = choose(game, 'action.endTurn')
    expect(enemies(game)[0]).toMatchObject({ location: 'C', engagedWith: null })
  })
})

describe('daño, horror y eliminación (RR "Defeat", "Elimination")', () => {
  it('con daño igual a la salud el investigador queda eliminado y termina el escenario', () => {
    let game = during(
      newTestGame({ investigator: { health: 1 } }),
      (s) => ({ ...s, investigators: s.investigators.map((i) => ({ ...i, clues: 2 })) }),
      spawnAt('A'),
    )
    game = choose(game, 'action.draw')
    expect(inv(game).eliminated).toBe(true)
    expect(game.locations.A?.clues).toBe(2 + 2)
    expect(game.outcome).toEqual({ type: 'noResolution' })
    expect(() => applyInput(game, { investigator: 'a', choice: 0 })).toThrow(EngineError)
  })

  it('si queda alguien, la partida sigue y el enemigo se enfrenta a otro', () => {
    let game = newTestGame({ players: ['a', 'b'], investigator: { sanity: 1 } })
    game = choose(game, 'choice.investigator', { name: 'A' })
    game = during(game, keep, spawnAt('A', ghoul, 'a'))
    game = choose(game, 'action.draw')
    expect(inv(game, 'a').eliminated).toBe(true)
    expect(game.outcome).toBeNull()
    expect(enemies(game)[0]?.engagedWith).toBe('b')
  })
})

describe('plan y acto', () => {
  it('el plan avanza al llegar a su umbral de perdición', () => {
    let game = newTestGame({ scenario: { encounterDeck: [] } })
    for (let r = 0; r < 3; r++) game = choose(game, 'action.endTurn')
    // Rondas 2, 3 y 4 colocan perdición: 3 ≥ 3 → plan 2.
    expect(game.agendaIndex).toBe(1)
    expect(game.doom).toBe(0)
  })

  it('si avanza el último plan, el escenario termina sin resolución', () => {
    let game = newTestGame({
      scenario: { encounterDeck: [], agendas: [{ name: 'Only', doomThreshold: 1 }] },
    })
    game = choose(game, 'action.endTurn')
    expect(game.outcome).toEqual({ type: 'noResolution' })
  })

  it('el acto se puede avanzar en cualquier turno gastando pistas → resolución 1', () => {
    let game = during(newTestGame(), withBag(0))
    expect(labels(game)).not.toContain('action.advanceAct')
    game = choose(game, 'action.investigate')
    game = choose(game, 'action.investigate')
    expect(inv(game).clues).toBe(2)
    game = choose(game, 'action.advanceAct')
    expect(inv(game).clues).toBe(0)
    expect(game.outcome).toEqual({ type: 'resolution', resolution: 1 })
  })

  it('acto con objetivo al final de la ronda', () => {
    let game = newTestGame({
      scenario: {
        acts: [
          {
            name: 'Act 1',
            clueThreshold: 1,
            cluesPerInvestigator: true,
            advanceTiming: 'endOfRound',
          },
          {
            name: 'Act 2',
            clueThreshold: 9,
            cluesPerInvestigator: false,
            advanceTiming: 'anytime',
          },
        ],
      },
    })
    game = during(game, withBag(0))
    game = choose(game, 'action.investigate')
    expect(labels(game)).not.toContain('action.advanceAct')
    game = choose(game, 'action.endTurn')
    expect(game.pending?.question.prompt).toBe('prompt.advanceAct')
    game = choose(game, 'action.advanceAct')
    expect(game.actIndex).toBe(1)
  })
})

describe('mantenimiento', () => {
  it('con más de 8 cartas hay que descartar hasta 8', () => {
    let game = during(newTestGame(), (s) => ({
      ...s,
      investigators: s.investigators.map((i) => ({ ...i, hand: [...i.hand, 'x', 'y', 'z'] })),
    }))
    game = choose(game, 'action.endTurn')
    // 8 + 1 robada en mantenimiento = 9 → descartar 1.
    expect(game.pending?.question.prompt).toBe('prompt.discardDownToHandSize')
    game = choose(game, 'choice.discard', { card: 'x' })
    expect(inv(game).hand).toHaveLength(8)
    expect(inv(game).discard).toEqual(['x'])
  })
})

describe('determinismo', () => {
  it('misma semilla y mismas decisiones → mismo estado', () => {
    const play = () => {
      let game = newTestGame({ scenario: { chaosBag: [1, 0, -1, -2, 'skull', 'autoFail'] } })
      for (let i = 0; i < 6; i++) {
        game = labels(game).includes('action.investigate')
          ? choose(game, 'action.investigate')
          : applyInput(game, { investigator: 'a', choice: 0 })
        if (game.outcome) break
      }
      return game
    }
    expect(play()).toEqual(play())
  })

  it('el estado es JSON serializable', () => {
    const game = during(newTestGame(), keep, spawnAt('A'))
    expect(JSON.parse(JSON.stringify(game))).toEqual(game)
  })

  it('shuffle es determinista y conserva los elementos', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8]
    expect(shuffle(items, 42)).toEqual(shuffle(items, 42))
    expect([...shuffle(items, 42)[0]].sort()).toEqual(items)
  })
})
