import { describe, expect, it } from 'vitest'
import { choose, during, labels } from '@lcg/engine/testing'
import { game, me, patch, play, withAsset } from './testing'

describe('02020: Laboratory Assistant', () => {
  // RR: Reactions; Hand Size.
  it('offers an optional entry reaction and draws exactly two cards', () => {
    let state = play(game(), '02020')
    expect(state.pending?.question.prompt).toBe('prompt.reaction')
    expect(me(state).hand).toHaveLength(0)
    state = choose(state, 'ability.drawCards')
    expect(me(state).hand).toHaveLength(2)
    expect(me(state).resources).toBe(8)
    expect(me(state).actionsRemaining).toBe(2)
  })
  it('can decline the draw, and reacts when put into play by another effect', () => {
    expect(me(choose(play(game(), '02020'), 'choice.skip')).hand).toHaveLength(0)
    let state = during(game(), patch({ hand: [] }), {
      type: 'PutAssetIntoPlay',
      investigator: 'a',
      code: '02020',
    })
    state = choose(state, 'ability.drawCards')
    expect(me(state).hand).toHaveLength(2)
    expect(me(state).actionsRemaining).toBe(3)
  })
  it('raises the hand limit only while it is controlled', () => {
    const cards = Array.from({ length: 10 }, (_, n) => `filler-${n}`)
    let state = during(game(), (s) => withAsset(patch({ hand: cards })(s), '02020'), {
      type: 'CheckHandSize',
      investigator: 'a',
    })
    expect(state.pending?.question.prompt).toBe('prompt.chooseAction')
    state = during(
      state,
      (s) => s,
      { type: 'DiscardAsset', asset: '02020' },
      { type: 'CheckHandSize', investigator: 'a' },
    )
    expect(labels(state)).toContain('choice.discard')
    state = choose(choose(state, 'choice.discard'), 'choice.discard')
    expect(me(state).hand).toHaveLength(8)
  })
})
