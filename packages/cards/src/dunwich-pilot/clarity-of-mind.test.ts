import { availableAbilities } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me, patch, withAsset } from './testing'

describe('02030: Clarity of Mind', () => {
  // RR: Activate Action; Uses; Healing; Attacks of Opportunity.
  it('spends a charge and an action to heal another investigator at the same location', () => {
    let state = during(game(['a', 'b']), (s) => withAsset(patch({ horror: 2 }, 'b')(s), '02030'))
    state = choose(state, 'ability.pilotHealHorror', { name: 'B' })
    expect(state.investigators[1]!.horror).toBe(1)
    expect(state.assets['02030']!.uses).toBe(2)
    expect(me(state).actionsRemaining).toBe(2)
  })
  it('cannot heal an uninjured investigator, another location, or spend an empty charge', () => {
    let state = during(game(['a', 'b']), (s) =>
      withAsset(patch({ horror: 1, location: 'B' }, 'b')(s), '02030'),
    )
    expect(
      availableAbilities(state, 'a').filter((a) => a.label === 'ability.pilotHealHorror'),
    ).toEqual([])
    state = during(state, (s) => withAsset(patch({ horror: 1 })(s), '02030', { uses: 0 }))
    expect(
      availableAbilities(state, 'a').filter((a) => a.label === 'ability.pilotHealHorror'),
    ).toEqual([])
  })
  it('remains in play after its last charge is spent', () => {
    let state = during(game(), (s) => withAsset(patch({ horror: 1 })(s), '02030', { uses: 1 }))
    state = choose(state, 'ability.pilotHealHorror')
    expect(state.assets['02030']!.uses).toBe(0)
    expect(me(state).horror).toBe(0)
  })
})
