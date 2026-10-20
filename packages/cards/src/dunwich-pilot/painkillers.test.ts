import { availableAbilities } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me, patch, withAsset } from './testing'

describe('02117: Painkillers', () => {
  // RR: Costs; Damage/Horror; Healing. The effect only heals the controller.
  it('pays horror before healing damage and preserves an empty asset in play', () => {
    let state = during(game(), (s) => withAsset(patch({ damage: 2 })(s), '02117', { uses: 1 }))
    state = choose(state, 'ability.pilotPainkillers')
    expect(me(state)).toMatchObject({ damage: 1, horror: 1, actionsRemaining: 3 })
    expect(state.assets['02117']).toMatchObject({ uses: 0, exhausted: true })
  })
  it('cannot be used without damage and cannot heal another investigator', () => {
    const state = during(game(['a', 'b']), (s) => withAsset(patch({ damage: 2 }, 'b')(s), '02117'))
    expect(availableAbilities(state, 'a').some((a) => a.label === 'ability.pilotPainkillers')).toBe(
      false,
    )
  })
  it('can assign the horror cost to Peter, before the controller is healed', () => {
    let state = during(game(), (s) =>
      withAsset(withAsset(patch({ damage: 1 })(s), '02117'), '02033'),
    )
    state = choose(state, 'ability.pilotPainkillers')
    expect(me(state).damage).toBe(1)
    state = choose(state, 'choice.assignToAsset', { card: 'Peter Sylvestre' })
    expect(me(state)).toMatchObject({ damage: 0, horror: 0 })
    expect(state.assets['02033']!.horror).toBe(1)
  })
  it('is available during the pre-token skill-test window', () => {
    let state = during(
      game(),
      (s) => withAsset(patch({ damage: 1, hand: [] })({ ...s, interactive: true }), '02117'),
      {
        type: 'BeginSkillTest',
        investigator: 'a',
        skill: 'intellect',
        difficulty: 0,
        kind: { type: 'investigate', location: 'A' },
      },
    )
    state = choose(state, 'ability.pilotPainkillers')
    expect(me(state)).toMatchObject({ damage: 0, horror: 1 })
    expect(state.skillTest?.tokens).toEqual([])
    expect(state.assets['02117']!.exhausted).toBe(true)
  })
})
