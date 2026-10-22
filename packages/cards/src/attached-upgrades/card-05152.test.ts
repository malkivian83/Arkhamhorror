import './index'
import { dispatch, playerCardDef, playableCards, type GameState } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'

const prepared = () =>
  during({ ...game(), interactive: true }, (s) =>
    withAsset(patch({ hand: ['05152', '05152', '60172'] })(s), '01016'),
  )
const attached = () => {
  const s = choose(prepared(), 'action.playFast', { card: 'Well-Maintained' })
  return choose(s, 'action.playFast', { card: 'Extended Barrel' })
}
const run = (s: GameState, ...messages: Parameters<typeof dispatch>[1][]) =>
  dispatch({ ...s, pending: null, queue: [] }, ...messages)
// RR: Leaves Play, Reactions, Limit X per asset.
describe('Well-Maintained', () => {
  it('attaches once to your own Item on your turn, at level 1 and cost 0', () => {
    const s = attached()
    expect(playerCardDef('05152')).toMatchObject({ xp: 1, cost: 0, fast: true })
    expect(me(s).resources).toBe(4)
    expect(playableCards(s, 'a', true)).not.toContain('05152')
    expect(playableCards(withAsset(s, '01016', { owner: 'b' }), 'a', true)).not.toContain('05152')
  })
  it('returns the discarded host and each other Upgrade to hand', () => {
    let s = run(attached(), { type: 'DiscardAsset', asset: '01016' })
    expect(s.pending?.question.prompt).toBe('prompt.reaction')
    s = choose(s, 'choice.wellMaintained', { card: '.45 Automatic' })
    expect(me(s).hand).toEqual(expect.arrayContaining(['01016', '60172', '05152']))
    expect(me(s).hand.filter((c) => c === '05152')).toHaveLength(1)
    expect(me(s).discard).toEqual(['05152'])
    expect(s.assets['01016']).toBeUndefined()
  })
  it('may be declined and does not trigger when the host returns to hand', () => {
    const declined = choose(
      run(attached(), { type: 'DiscardAsset', asset: '01016' }),
      'choice.skip',
    )
    expect(me(declined).discard).toEqual(expect.arrayContaining(['01016', '05152', '60172']))
    const returned = run(attached(), { type: 'ReturnAssetToHand', asset: '01016' })
    expect(returned.pending?.question.prompt).not.toBe('prompt.reaction')
    expect(me(returned).discard).toEqual(expect.arrayContaining(['05152', '60172']))
  })
})
