import { playableCards } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me, patch, play, withAsset } from './testing'

describe('02105: Emergency Aid', () => {
  // RR: Healing; Target. Only an investigator or an Ally asset at the same location.
  it('heals an investigator and pays the event cost', () => {
    let state = during(game(), patch({ damage: 3 }))
    state = play(state, '02105')
    expect(me(state).damage).toBe(1)
    expect(me(state).resources).toBe(8)
    expect(me(state).actionsRemaining).toBe(2)
    expect(me(state).discard).toContain('02105')
  })
  it('heals a colocated investigator’s Ally, without affecting their other damage', () => {
    let state = during(game(['a', 'b']), (s) =>
      withAsset(patch({ damage: 1 }, 'b')(s), '02033', { owner: 'b', damage: 1 }),
    )
    state = play(state, '02105')
    state = choose(state, 'choice.pilotHealDamage', { name: 'Peter Sylvestre' })
    expect(state.assets['02033']!.damage).toBe(0)
    expect(state.investigators[1]!.damage).toBe(1)
  })
  it('has no legal effect on a healthy investigator, distant Ally or non-Ally asset', () => {
    const state = during(game(['a', 'b']), (s) =>
      withAsset(
        withAsset(
          patch({ location: 'B' }, 'b')(patch({ hand: ['02105'], resources: 10 })(s)),
          '02033',
          { owner: 'b', damage: 1 },
        ),
        '12087',
        { damage: 1 },
      ),
    )
    expect(playableCards(state, 'a', false)).not.toContain('02105')
  })
})
