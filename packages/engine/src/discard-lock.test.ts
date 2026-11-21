// RR: Cannot, Engagement, Drawing Cards (empty investigator deck).
import { expect, it } from 'vitest'
import { dispatch } from './engine'
import { registerEnemy, registerPlayerCards } from './content'
import { canPlayByEffect } from './actions'
import { discardLocked } from './state'
import { ghoul, newTestGame, spawnAt, throughSetup } from './testing'
import type { Message } from './types'

registerEnemy({ code: 'test-discard-lock', locksEngagedDiscard: true })
registerPlayerCards([
  { code: 'lock-asset', name: 'Asset', type: 'asset', class: 'neutral', cost: 0, traits: [] },
])
function game() {
  const initial = throughSetup(newTestGame({ players: ['a', 'b'] }))
  return dispatch(
    {
      ...initial,
      pending: null,
      queue: [],
      investigators: initial.investigators.map((i) => ({
        ...i,
        deck: [],
        discard: ['old-card', 'old-card'],
        hand: [],
      })),
    },
    spawnAt('A', { ...ghoul, code: 'test-discard-lock' }, 'a'),
  )
}

it('locks only the engaged investigator, including while the enemy is exhausted', () => {
  const s = game()
  expect(discardLocked(s, 'a')).toBe(true)
  expect(discardLocked(s, 'b')).toBe(false)
  const enemy = Object.values(s.enemies)[0]!
  expect(discardLocked({ ...s, enemies: { [enemy.id]: { ...enemy, exhausted: true } } }, 'a')).toBe(
    true,
  )
  expect(
    discardLocked({ ...s, enemies: { [enemy.id]: { ...enemy, engagedWith: null } } }, 'a'),
  ).toBe(false)
})

for (const message of [
  { type: 'DiscardToHand', investigator: 'a', code: 'old-card' },
  { type: 'RemoveFromDiscard', investigator: 'a', code: 'old-card' },
  { type: 'RemoveCardFromDiscard', investigator: 'a', code: 'old-card' },
  { type: 'RemoveDiscardFromGame', investigator: 'a' },
] satisfies Message[]) {
  it(`prevents ${message.type} without losing either physical copy`, () => {
    const s = game()
    const next = dispatch(s, message)
    expect(next.investigators[0]!.discard).toEqual(['old-card', 'old-card'])
    expect(next.investigators[0]!.hand).toEqual([])
    expect(next.investigators[0]!.deck).toEqual([])
  })
}

it('does not reshuffle a locked discard when drawing from an empty deck, but takes the horror', () => {
  const s = game()
  const next = dispatch(s, { type: 'DrawCards', investigator: 'a', amount: 2 })
  expect(next.investigators[0]!.discard).toEqual(['old-card', 'old-card'])
  expect(next.investigators[0]!.hand).toEqual([])
  expect(next.investigators[0]!.horror).toBe(s.investigators[0]!.horror + 1)
  expect(next.rng).toEqual(s.rng)
})

it('recovers a physical card normally once the locking enemy leaves', () => {
  const s = game()
  const next = dispatch(
    { ...s, enemies: {} },
    { type: 'DiscardToHand', investigator: 'a', code: 'old-card' },
  )
  expect(next.investigators[0]!.discard).toEqual(['old-card'])
  expect(next.investigators[0]!.hand).toEqual(['old-card'])
})

it('blocks both paid-play permission and direct asset entry from the locked discard', () => {
  const initial = game()
  const s = {
    ...initial,
    investigators: initial.investigators.map((i) => ({ ...i, discard: ['lock-asset'] })),
  }
  expect(canPlayByEffect(s, 'a', 'lock-asset', 'discard')).toBe(false)
  const message: Message = {
    type: 'PutAssetIntoPlay',
    investigator: 'a',
    code: 'lock-asset',
    fromDiscard: 'a',
  }
  expect(Object.values(dispatch(s, message).assets)).toHaveLength(0)
  const unlocked = { ...s, enemies: {} }
  expect(canPlayByEffect(unlocked, 'a', 'lock-asset', 'discard')).toBe(true)
  const played = dispatch(unlocked, message)
  expect(Object.values(played.assets).map((a) => a.code)).toEqual(['lock-asset'])
  expect(played.investigators[0]!.discard).toEqual([])
})
