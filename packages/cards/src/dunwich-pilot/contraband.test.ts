import { playableCards } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, hand, patch, play, withAsset } from './testing'

describe('02109: Contraband', () => {
  // RR: Uses; Target. Only current ammunition or supplies, including another controller.
  it('doubles remaining ammunition rather than the printed starting amount', () => {
    const state = play(
      during(game(), (s) => withAsset(s, '12019', { uses: 2 })),
      '02109',
    )
    expect(state.assets['12019']!.uses).toBe(4)
  })
  it('doubles a chosen nearby asset’s supplies, and leaves other assets unchanged', () => {
    let state = play(
      during(game(['a', 'b']), (s) =>
        withAsset(withAsset(s, '12019', { uses: 1 }), '12031', { owner: 'b', uses: 2 }),
      ),
      '02109',
    )
    state = choose(state, 'choice.pilotDoubleUses', { card: 'Fingerprint Kit' })
    expect(state.assets['12031']!.uses).toBe(4)
    expect(state.assets['12019']!.uses).toBe(1)
  })
  it('does not refill zero uses, charges, secrets or a distant asset', () => {
    const state = hand(
      during(game(['a', 'b']), (s) =>
        withAsset(
          withAsset(withAsset(patch({ location: 'B' }, 'b')(s), '12019', { owner: 'b' }), '12031', {
            uses: 0,
          }),
          '12033',
        ),
      ),
      '02109',
    )
    expect(playableCards(state, 'a', false)).not.toContain('02109')
  })
})
