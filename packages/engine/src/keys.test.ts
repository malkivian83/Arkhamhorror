import { describe, expect, it } from 'vitest'
import { availableAbilities } from './actions'
import { dispatch } from './engine'
import { getInvestigator } from './state'
import { choose, during, keep, newTestGame } from './testing'
import type { GameState } from './types'

// RR Keys (City of the Elder Things): chaos tokens kept on locations and investigators.
const withKeys = (game: GameState, clues = 0): GameState => ({
  ...game,
  locations: { ...game.locations, A: { ...game.locations.A!, clues, keys: ['skull', -2] } },
})
/** Close the action menu so that messages can be dispatched directly. */
const idle = (game: GameState): GameState => ({ ...game, pending: null, queue: [] })
const ability = (game: GameState, id: string, key: string) =>
  availableAbilities(game, id).find((option) => option.key === key)

describe('keys', () => {
  it('can be taken from a location with no clues, as a free ability', () => {
    const game = during(newTestGame(), withKeys)
    const take = ability(game, 'a', 'key:take:skull')
    expect(take).toMatchObject({ actions: 0, label: 'ability.takeKey.skull' })
    expect(
      ability(
        during(newTestGame(), (s) => withKeys(s, 1)),
        'a',
        'key:take:skull',
      ),
    ).toBeUndefined()
    const next = dispatch(idle(game), ...take!.then)
    expect(getInvestigator(next, 'a').keys).toEqual(['skull'])
    expect(next.locations.A?.keys).toEqual([-2])
    expect(ability(next, 'a', 'key:take:-2')?.label).toBe('ability.takeKey.number')
  })

  it('can be given to another investigator at the same location', () => {
    let game = choose(newTestGame({ players: ['a', 'b'] }), 'choice.investigator', { name: 'A' })
    game = during(game, (s) => ({
      ...s,
      investigators: s.investigators.map((i) => (i.id === 'a' ? { ...i, keys: ['tablet'] } : i)),
    }))
    const give = ability(game, 'a', 'key:give:tablet:b')!
    game = dispatch(idle(game), ...give.then)
    expect(getInvestigator(game, 'a').keys).toEqual([])
    expect(getInvestigator(game, 'b').keys).toEqual(['tablet'])
  })

  it('records spent keys and drops the keys of an eliminated investigator', () => {
    let game = during(
      choose(newTestGame({ players: ['a', 'b'] }), 'choice.investigator', { name: 'A' }),
      (s) => ({
        ...s,
        investigators: s.investigators.map((i) =>
          i.id === 'a' ? { ...i, keys: ['tablet', 'tablet', 0] } : i,
        ),
      }),
    )
    game = dispatch(idle(game), {
      type: 'SpendKeys',
      investigator: 'a',
      keys: ['tablet', 'tablet'],
    })
    expect(game.keysSpent).toEqual(['tablet', 'tablet'])
    expect(getInvestigator(game, 'a').keys).toEqual([0])
    game = dispatch(game, { type: 'EliminateInvestigator', investigator: 'a' })
    expect(game.locations.A?.keys).toEqual([0])
  })

  it('cannot spend keys that the investigator does not control', () => {
    const game = during(newTestGame(), keep)
    const next = dispatch(idle(game), { type: 'SpendKeys', investigator: 'a', keys: ['skull'] })
    expect(next.keysSpent).toBeUndefined()
  })
})
