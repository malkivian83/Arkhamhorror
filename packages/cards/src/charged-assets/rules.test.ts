// RR: Uses, Replenish, Play Restrictions, Forced Abilities, Limits.
import { expect, it } from 'vitest'
import { dispatch, playerCardBehavior, type GameState } from '@lcg/engine'
import { game, patch, me, withAsset } from '../dunwich-pilot/testing'
import './index'
import { ghoul } from '@lcg/engine/testing'
const foe = (s: GameState): GameState => ({
  ...s,
  enemies: {
    foe: {
      ...ghoul,
      id: 'foe',
      location: 'A',
      engagedWith: 'a',
      health: 20,
      maxHealth: 20,
      damageTaken: 0,
      exhausted: false,
      doom: 0,
    },
  },
})
it.each(['09082', '09096', '09085', '09098'])(
  '%s offers both skills and distinct doom modes, with powered mode unavailable exhausted',
  (code) => {
    let s = withAsset(foe(start()), code)
    const b = playerCardBehavior(code)!
    const options = b.abilities!(s, s.assets[code]!, 'a')
    expect(options).toHaveLength(4)
    for (const o of options) {
      const m = o.then[0]!
      expect(m.type).toBe('BeginSkillTest')
      if (m.type !== 'BeginSkillTest') throw new Error('Expected skill test')
      const powered = o.costs?.some((c) => c.type === 'PlaceDoomOnAsset')
      const high = ['09096', '09098'].includes(code)
      expect(m.modifier).toBe((m.skill === 'willpower' ? 0 : 1) + (powered ? (high ? 3 : 1) : 0))
      if (powered) expect(o.costs).toContainEqual({ type: 'ExhaustAsset', asset: code })
      if (m.kind.type === 'fight') expect(m.kind.extraDamage).toBe(powered ? 1 : 0)
    }
    s = withAsset(s, code, { exhausted: true })
    expect(b.abilities!(s, s.assets[code]!, 'a')).toHaveLength(2)
  },
)
it.each(['10065', '10077'])('%s consumes ammo and supports combat or agility', (code) => {
  const s = withAsset(foe(start()), code)
  const b = playerCardBehavior(code)!
  const options = b.abilities!(s, s.assets[code]!, 'a')
  expect(options).toHaveLength(2)
  for (const o of options) {
    expect(o.costs).toContainEqual({ type: 'SpendUses', asset: code, amount: 1 })
    expect(o.then[0]).toMatchObject({
      type: 'BeginSkillTest',
      modifier: code === '10077' ? 2 : 0,
      kind: { type: 'fight', extraDamage: 1 },
    })
  }
  const empty = withAsset(s, code, { uses: 0 })
  expect(b.abilities!(empty, empty.assets[code]!, 'a')).toEqual([])
})
it.each(['10066', '10082'])('%s adds suspicion to its distinct Parley difficulty', (code) => {
  const s = withAsset(foe(start()), code, { uses: 3 })
  const o = playerCardBehavior(code)!.abilities!(s, s.assets[code]!, 'a')[0]!
  expect(o.parley).toBe(true)
  expect(o.provokes).toBe(false)
  expect(o.then[0]).toMatchObject({
    type: 'BeginSkillTest',
    difficulty: code === '10066' ? 4 : 3,
    tags: ['parley'],
  })
  expect(o.costs).toEqual(code === '10066' ? [{ type: 'ExhaustAsset', asset: code }] : [])
})
const start = (): GameState =>
  patch({ hand: [], resources: 0 })({ ...game(), pending: null, queue: [] })
it.each(['08120', '08121', '08122', '08123', '08124'])(
  '%s replenishes missing resources and preserves extras',
  (code) => {
    const b = playerCardBehavior(code)!
    for (const uses of [0, 1, 2, 4]) {
      const s = withAsset(start(), code, { uses })
      const messages = b.forced!(s, { type: 'roundBegins' }, s.assets[code]!)
      const next = messages.reduce((state, message) => dispatch(state, message), s)
      expect(next.assets[code]!.uses).toBe(Math.max(2, uses))
    }
  },
)
it('the third Glyph secret from any source discards it, grants resources and records translation', () => {
  let s = withAsset(start(), '03025', { uses: 2 })
  s = dispatch(s, { type: 'AddUses', asset: '03025', amount: 1 })
  expect(s.assets['03025']).toBeUndefined()
  expect(me(s).resources).toBe(5)
  expect(me(s).discard).toContain('03025')
})
it.each(['09103', '11085'])('%s restricts play to discard and shuffles only on defeat', (code) => {
  const s = withAsset(start(), code)
  const b = playerCardBehavior(code)!
  expect(b.onlyFromDiscard).toBe(true)
  expect(b.playableFromDiscard).toBe(true)
  expect(b.whenDefeated!(s, s.assets[code]!)).toEqual([
    { type: 'ShuffleAssetIntoDeck', asset: code },
  ])
  const discarded = dispatch(s, { type: 'DiscardAsset', asset: code })
  expect(me(discarded).discard).toContain(code)
})
