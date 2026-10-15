import { describe, expect, it } from 'vitest'
import { applyInput, createGame, dispatch, EngineError } from './engine'
import { shuffle } from './rng'

describe('createGame', () => {
  it('da 5 recursos a cada jugador y empieza la ronda 1 en investigación', () => {
    const game = createGame({ seed: 1, players: ['a', 'b'] })
    expect(game.players.map((p) => p.resources)).toEqual([5, 5])
    expect(game.round).toBe(1)
    expect(game.phase).toBe('investigation')
    expect(game.queue).toEqual([])
  })

  it('rechaza más de 4 jugadores', () => {
    expect(() => createGame({ seed: 1, players: ['a', 'b', 'c', 'd', 'e'] })).toThrow(EngineError)
  })

  it('el estado es JSON serializable', () => {
    const game = createGame({ seed: 7, players: ['a'] })
    expect(JSON.parse(JSON.stringify(game))).toEqual(game)
  })
})

describe('preguntas', () => {
  const ask = (game: ReturnType<typeof createGame>) =>
    dispatch(game, {
      type: 'Ask',
      player: 'a',
      question: {
        kind: 'chooseOne',
        choices: [
          { label: 'choice.nothing', then: [] },
          {
            label: 'choice.gainResource',
            then: [{ type: 'GainResources', player: 'a', amount: 1 }],
          },
        ],
      },
    })

  it('detiene el motor hasta que el jugador responde', () => {
    const asked = ask(createGame({ seed: 1, players: ['a'] }))
    expect(asked.pending?.player).toBe('a')
    const answered = applyInput(asked, { player: 'a', choice: 1 })
    expect(answered.pending).toBeNull()
    expect(answered.players[0]?.resources).toBe(6)
  })

  it('rechaza respuestas de otro jugador u opciones inexistentes', () => {
    const asked = ask(createGame({ seed: 1, players: ['a', 'b'] }))
    expect(() => applyInput(asked, { player: 'b', choice: 0 })).toThrow(EngineError)
    expect(() => applyInput(asked, { player: 'a', choice: 9 })).toThrow(EngineError)
  })
})

describe('rng', () => {
  it('es determinista con la misma semilla', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8]
    expect(shuffle(items, 42)).toEqual(shuffle(items, 42))
    expect(shuffle(items, 42)[0]).not.toEqual(items)
    expect([...shuffle(items, 42)[0]].sort()).toEqual(items)
  })
})
