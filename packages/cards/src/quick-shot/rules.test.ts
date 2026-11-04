// RR: Fast, Myriad, Draw vs Add to Hand, Costs, Enemy Damage.
import { expect, it } from 'vitest'
import { dispatch, playerCardBehavior, registerScenario, type GameState } from '@lcg/engine'
import { choose, ghoul } from '@lcg/engine/testing'
import { game, patch, me } from '../dunwich-pilot/testing'
import './index'
const start = (): GameState => {
  const s = patch({ hand: [], deck: ['11031'], resources: 5 })({
    ...game(['a', 'b']),
    pending: null,
    queue: [],
  })
  return {
    ...s,
    enemies: {
      foe: {
        ...ghoul,
        id: 'foe',
        location: 'A',
        engagedWith: 'a',
        exhausted: false,
        maxHealth: 4,
        damageTaken: 0,
        doom: 0,
      },
    },
  }
}
it('normal fast play pays two resources, deals one damage, and spends no action or opportunity attack', () => {
  const s = dispatch(patch({ hand: ['11031'] })(start()), {
    type: 'PlayCard',
    investigator: 'a',
    code: '11031',
  })
  expect(me(s)).toMatchObject({ resources: 3, actionsRemaining: 3, damage: 0, horror: 0 })
  expect(s.enemies.foe!.damageTaken).toBe(1)
})
it('drawing during your turn offers the reaction with the full two-resource discount', () => {
  let s = dispatch(patch({ resources: 0 })(start()), {
    type: 'DrawCards',
    investigator: 'a',
    amount: 1,
  })
  s = choose(s, 'ability.playCard', { card: 'Quick Shot' })
  expect(s.enemies.foe!.damageTaken).toBe(1)
  expect(me(s)).toMatchObject({ resources: 0, hand: [], discard: ['11031'] })
})
it('drawing out of turn or merely adding a card to hand does not allow discounted play', () => {
  const s = dispatch(
    { ...start(), activeTurn: 'b' },
    { type: 'DrawCards', investigator: 'a', amount: 1 },
  )
  expect(s.pending).toBeNull()
  expect(me(s).hand).toContain('11031')
  const added = dispatch(patch({ discard: ['11031'], deck: [] })(start()), {
    type: 'DiscardToHand',
    investigator: 'a',
    code: '11031',
  })
  expect(added.pending).toBeNull()
})
it('the draw discount still pays cost increases and cannot bypass insufficient resources', () => {
  registerScenario({ id: 'quick-shot-tax', cardCostModifier: () => 1 })
  const taxed = { ...start(), scenarioId: 'quick-shot-tax' }
  const draw = { type: 'DrawCards' as const, investigator: 'a', amount: 1 }
  const blocked = dispatch(patch({ resources: 0 })(taxed), draw)
  expect(blocked.pending).toBeNull()
  expect(me(blocked).hand).toContain('11031')
  const allowed = choose(dispatch(patch({ resources: 1 })(taxed), draw), 'ability.playCard', {
    card: 'Quick Shot',
  })
  expect(me(allowed).resources).toBe(0)
  expect(allowed.enemies.foe!.damageTaken).toBe(1)
  const unpaid = dispatch(patch({ hand: ['11031'], resources: 0 })(start()), {
    type: 'PlayCard',
    investigator: 'a',
    code: '11031',
  })
  expect(me(unpaid)).toMatchObject({ resources: 0, hand: ['11031'] })
  expect(unpaid.enemies.foe!.damageTaken).toBe(0)
})
it('permits aloof and Elite enemies but excludes remote or immune targets', () => {
  const s = start(),
    b = playerCardBehavior('11031')!
  expect(
    b.canPlay!(
      { ...s, enemies: { foe: { ...s.enemies.foe!, traits: ['Elite'], keywords: ['aloof'] } } },
      'a',
    ),
  ).toBe(true)
  expect(b.canPlay!({ ...s, enemies: { foe: { ...s.enemies.foe!, location: 'C' } } }, 'a')).toBe(
    false,
  )
  registerScenario({ id: 'quick-shot-immune', enemyImmune: () => true })
  expect(b.canPlay!({ ...s, scenarioId: 'quick-shot-immune' }, 'a')).toBe(false)
})
