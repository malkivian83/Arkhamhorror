import { dispatch, playableCards, playerCardBehavior, type SkillTest } from '@lcg/engine'
import { choose, during, labels } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, hand, me, withAsset } from './testing'

describe('02033: Peter Sylvestre', () => {
  // RR: Constant Abilities; Reactions; Unique.
  it('adds agility and no bonus to another skill', () => {
    const state = withAsset(game(), '02033'),
      self = state.assets['02033']!
    const modifier = playerCardBehavior('02033')!.skillModifier!
    expect(modifier(state, self, { skill: 'agility' } as SkillTest)).toBe(1)
    expect(modifier(state, self, { skill: 'combat' } as SkillTest)).toBe(0)
  })
  it('heals only its own horror, optionally, after its controller ends a turn', () => {
    let state = during(game(), (s) => withAsset(s, '02033', { horror: 1, damage: 0 }), {
      type: 'Forced',
      trigger: { type: 'turnEnds', investigator: 'a' },
    })
    expect(labels(state)).toContain('ability.healAsset')
    state = choose(state, 'ability.healAsset')
    expect(state.assets['02033']!.horror).toBe(0)
    state = during(state, (s) => withAsset(s, '02033', { horror: 1 }), {
      type: 'Forced',
      trigger: { type: 'turnEnds', investigator: 'b' },
    })
    expect(state.pending?.question.prompt).toBe('prompt.chooseAction')
    expect(state.assets['02033']!.horror).toBe(1)
  })
  it('does not allow a second unique copy controlled by any investigator', () => {
    const state = hand(
      during(game(['a', 'b']), (s) => withAsset(s, '02033', { owner: 'b' })),
      '02033',
    )
    expect(playableCards(state, 'a', false)).not.toContain('02033')
    const direct = dispatch(
      { ...state, pending: null, queue: [] },
      { type: 'PutAssetIntoPlay', investigator: 'a', code: '02033' },
    )
    expect(Object.values(direct.assets).filter((a) => a.code === '02033')).toHaveLength(1)
    expect(me(state).hand).toContain('02033')
  })
})
