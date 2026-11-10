import { describe, expect, it } from 'vitest'
import { poolTokensAvailable } from './handlers'
import { during, newTestGame } from './testing'
import type { GameState, SealHolder } from './types'

// RR Seal: released tokens return to the chaos bag; bless/curse tokens returned "to the token
// pool" leave play and count again as available in the pool.
const holder: SealHolder = { type: 'asset', id: 'x' }
const sealed = (s: GameState): GameState => ({
  ...s,
  chaosBag: [0],
  sealed: [
    { token: 'bless', investigator: 'a', code: 'x', holder },
    { token: 'bless', investigator: 'a', code: 'x', holder },
    { token: 'skull', investigator: 'a', code: 'x', holder },
    { token: 'bless', investigator: 'a', code: 'y', holder: { type: 'asset', id: 'y' } },
  ],
})
// Holder assets "x" and "y" stay in play so that only the message under test releases seals.
const withHolders = (s: GameState): GameState => {
  const asset = { owner: 'a', damage: 0, horror: 0, exhausted: false, uses: 0 }
  return {
    ...sealed(s),
    assets: {
      ...s.assets,
      x: { ...asset, id: 'x', code: 'x' },
      y: { ...asset, id: 'y', code: 'y' },
    } as GameState['assets'],
  }
}

describe('Liberar fichas selladas', () => {
  it('libera hasta `count` fichas del tipo indicado a la bolsa', () => {
    const game = during(newTestGame(), withHolders, {
      type: 'ReleaseSealedTokens',
      holder,
      token: 'bless',
      count: 1,
    })
    expect(game.chaosBag).toEqual([0, 'bless'])
    expect(
      game.sealed?.filter((e) => e.holder?.type === 'asset' && e.holder.id === 'x'),
    ).toHaveLength(2)
  })

  it('las devuelve a la reserva con `toPool`, sin pasar por la bolsa', () => {
    const before = during(newTestGame(), withHolders)
    const game = during(before, (s) => s, { type: 'ReleaseSealedTokens', holder, toPool: true })
    // Bless tokens leave play; the skull goes back to the bag.
    expect(game.chaosBag).toEqual([0, 'skull'])
    expect(game.sealed).toHaveLength(1)
    expect(poolTokensAvailable(game, 'bless')).toBe(poolTokensAvailable(before, 'bless') + 2)
  })
})
