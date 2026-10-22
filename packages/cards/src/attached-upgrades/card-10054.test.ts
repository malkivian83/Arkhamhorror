import './index'
import {
  dispatch,
  playerCardDef,
  playableCards,
  registerPlayerCards,
  type GameState,
} from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'
registerPlayerCards([
  {
    code: 'fine-science',
    name: 'Test Science',
    type: 'asset',
    class: 'neutral',
    traits: ['Science'],
    icons: {},
  },
])
const prepared = (host = 'fine-science') =>
  during({ ...game(), interactive: true }, (s) => withAsset(patch({ hand: ['10054'] })(s), host))
const play = (s: GameState) => choose(s, 'action.play', { card: 'Fine Tuning' })
const exhaust = (s: GameState) =>
  dispatch({ ...s, pending: null, queue: [] }, { type: 'ExhaustAsset', asset: 'fine-science' })
// RR: Reactions, Exhaust, Ready; Fine Tuning is not Fast.
describe('Fine Tuning', () => {
  it('is played as an action on your Tool or Science asset, at level 1 and cost 2', () => {
    const s = play(prepared())
    expect(playerCardDef('10054')).toMatchObject({ xp: 1, cost: 2 })
    expect(playerCardDef('10054')?.fast).toBeUndefined()
    expect(me(s).resources).toBe(3)
    expect(me(s).actionsRemaining).toBe(2)
    expect(playableCards(prepared(), 'a', true)).not.toContain('10054')
    expect(play(prepared('01087')).assets['01087']!.upgrades).toHaveLength(1)
  })
  it('readies the host once after it exhausts, then waits for the upkeep phase', () => {
    let s = exhaust(play(prepared()))
    expect(s.pending?.question.prompt).toBe('prompt.reaction')
    s = choose(s, 'choice.fineTuning', { card: 'Test Science' })
    expect(s.assets['fine-science']).toMatchObject({ exhausted: false })
    expect(s.assets['fine-science']!.upgrades![0]!.exhausted).toBe(true)
    s = exhaust(s)
    expect(s.pending?.question.prompt).not.toBe('prompt.reaction')
    expect(s.assets['fine-science']!.exhausted).toBe(true)
    s = dispatch({ ...s, pending: null, queue: [] }, { type: 'ReadyAll' })
    expect(s.assets['fine-science']!.upgrades![0]!.exhausted).toBeUndefined()
  })
  it('may be declined, leaving the host exhausted', () => {
    const s = choose(exhaust(play(prepared())), 'choice.skip')
    expect(s.assets['fine-science']!.exhausted).toBe(true)
    expect(s.assets['fine-science']!.upgrades![0]!.exhausted).toBeUndefined()
  })
})
