import { dispatch, getInvestigator, registerPlayerCards, type GameState } from '@lcg/engine'
import { choose, newTestGame } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { registerTekelili } from './tekelili'

registerTekelili()
registerPlayerCards(
  ['test-tekeli-asset', 'test-tekeli-other'].map((code) => ({
    code,
    name: code,
    type: 'asset',
    class: 'neutral',
    traits: [],
    cost: 0,
  })),
)

const fresh = () => ({ ...newTestGame({ players: ['a', 'b'] }), queue: [], pending: null })
const inv = (state: GameState) => getInvestigator(state, 'a')
const owned = (state: GameState, id = 'a') => state.campaignLog!.investigators[id]!.storyAssets
const give = (state: GameState, amount: number, investigator = 'a') =>
  dispatch(state, { type: 'ShuffleTekeliliIntoDeck', investigator, amount })

function reveal(code: string, inTurn = false) {
  const state = dispatch(fresh(), { type: 'InitializeTekeliliDeck' })
  const at = state.tekeliliDeck!.indexOf(code)
  const given = give(
    { ...state, tekeliliDeck: [code, ...state.tekeliliDeck!.filter((_, n) => n !== at)] },
    1,
  )
  const assets = dispatch(
    given,
    { type: 'PutAssetIntoPlay', investigator: 'a', code: 'test-tekeli-asset' },
    { type: 'PutAssetIntoPlay', investigator: 'a', code: 'test-tekeli-other' },
  )
  const game: GameState = {
    ...assets,
    ...(inTurn ? { phase: 'investigation', activeTurn: 'a' } : {}),
    investigators: assets.investigators.map((i) =>
      i.id === 'a'
        ? {
            ...i,
            hand: ['test-tekeli-asset'],
            deck: [code],
            clues: 1,
            resources: 5,
            actionsRemaining: 3,
          }
        : i,
    ),
  }
  const drawn = dispatch(game, { type: 'DrawCards', investigator: 'a', amount: 1 })
  return drawn.pending ? choose(drawn, 'choice.discard', { card: 'test-tekeli-asset' }) : drawn
}

// Guía de campaña, p. 3, «¡Tekeli-li!», y revelación impresa de cada código.
describe('Tekeli-li', () => {
  it('shares 16 copies, preserves the deck on reload, and excludes all assigned copies on the next setup', () => {
    const state = dispatch(fresh(), { type: 'InitializeTekeliliDeck' })
    expect(state.tekeliliDeck?.toSorted()).toEqual([
      '08723',
      '08723',
      '08723',
      '08724',
      '08724',
      '08724',
      '08725',
      '08725',
      '08726',
      '08726',
      '08727',
      '08727',
      '08728',
      '08728',
      '08729',
      '08729',
    ])
    const taken = give(state, 5)
    expect(inv(taken).deck).toHaveLength(inv(state).deck.length + 5)
    const saved: GameState = JSON.parse(JSON.stringify(taken))
    const resumed = dispatch(saved, { type: 'InitializeTekeliliDeck' })
    expect(resumed.tekeliliDeck).toEqual(taken.tekeliliDeck)
    const next = dispatch(
      { ...fresh(), campaignLog: saved.campaignLog! },
      { type: 'InitializeTekeliliDeck' },
    )
    expect(next.tekeliliDeck?.toSorted()).toEqual(taken.tekeliliDeck?.toSorted())
    const exhausted = give(next, 99, 'b')
    expect(exhausted.tekeliliDeck).toEqual([])
    expect(owned(exhausted, 'b')).toHaveLength(11)
    expect(give(exhausted, 1)).toEqual(exhausted)
  })

  it.each([
    ['08723', { horror: 1 }],
    ['08724', { damage: 1 }],
    ['08725', { hand: [], discard: ['test-tekeli-asset'] }],
    ['08726', { resources: 3 }],
    ['08727', { nextTurnActionLoss: 1 }],
    ['08728', { clues: 0 }],
    ['08729', { discard: ['test-tekeli-asset'] }],
  ] as const)(
    'resolves the printed effect of %s and returns exactly one copy to the bottom',
    (code, expected) => {
      const game = reveal(code)
      expect(inv(game)).toMatchObject(expected)
      expect(game.tekeliliDeck).toHaveLength(16)
      expect(game.tekeliliDeck?.at(-1)).toBe(code)
      expect(owned(game)).toEqual([])
      expect(inv(game).discard).not.toContain(code)
      if (code === '08728') expect(game.locations.A!.clues).toBe(fresh().locations.A!.clues + 1)
      if (code === '08729')
        expect(Object.values(game.assets).map((asset) => asset.code)).toEqual(['test-tekeli-other'])
    },
  )

  it('loses an action now if the weakness is drawn on the investigator’s turn', () => {
    expect(inv(reveal('08727', true))).toMatchObject({ actionsRemaining: 2 })
  })
})
