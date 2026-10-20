import { availableAbilities } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me, patch, withAsset } from './testing'

describe('02116: Smoking Pipe', () => {
  // RR: Costs; Damage/Horror; Healing. No action or opportunity attack for a free ability.
  it('pays supply, exhaustion and damage before healing horror, without an action', () => {
    let state = during(game(), (s) => withAsset(patch({ horror: 2 })(s), '02116'))
    state = choose(state, 'ability.pilotPipe')
    expect(me(state)).toMatchObject({ horror: 1, damage: 1, actionsRemaining: 3 })
    expect(state.assets['02116']).toMatchObject({ uses: 2, exhausted: true })
    expect(availableAbilities(state, 'a').some((a) => a.label === 'ability.pilotPipe')).toBe(false)
  })
  it('cannot be used without horror to heal or without supplies', () => {
    const state = during(game(), (s) => withAsset(s, '02116'))
    expect(availableAbilities(state, 'a').some((a) => a.label === 'ability.pilotPipe')).toBe(false)
    const empty = during(state, (s) => withAsset(patch({ horror: 1 })(s), '02116', { uses: 0 }))
    expect(availableAbilities(empty, 'a').some((a) => a.label === 'ability.pilotPipe')).toBe(false)
  })
  it('allows damage paid as a cost to be assigned to an asset', () => {
    let state = during(game(), (s) =>
      withAsset(withAsset(patch({ horror: 1 })(s), '02116'), '12087'),
    )
    state = choose(state, 'ability.pilotPipe')
    expect(me(state).horror).toBe(1)
    state = choose(state, 'choice.assignToAsset')
    expect(me(state)).toMatchObject({ damage: 0, horror: 0 })
  })
  it('does not heal an investigator eliminated while paying the cost', () => {
    let state = during(game(['a', 'b']), (s) =>
      withAsset(patch({ damage: 7, horror: 2 })(s), '02116'),
    )
    state = choose(state, 'ability.pilotPipe')
    expect(me(state).eliminated).toBe(true)
    expect(me(state).horror).toBe(2)
  })
})
