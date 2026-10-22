import './index'
import { assetSlots, playerCardDef, playableCards, type GameState } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'

const prepared = (tool = '01087') =>
  during({ ...game(), interactive: true }, (s) =>
    withAsset(withAsset(patch({ hand: ['10028', '12020'], resources: 10 })(s), tool), '01016'),
  )
const tinker = (s: GameState) => choose(s, 'action.playFast', { card: 'Tinker' })
// RR: Equipment Slots, Limit X per asset.
describe('Tinker', () => {
  it('attaches once to your own Tool on your turn, at level 0 and cost 1', () => {
    const s = tinker(prepared())
    expect(playerCardDef('10028')).toMatchObject({ xp: 0, cost: 1, fast: true })
    expect(me(s).resources).toBe(9)
    expect(s.assets['01087']!.upgrades).toEqual([{ code: '10028', owner: 'a' }])
    expect(playableCards(withAsset(s, '01087', { owner: 'b' }), 'a', true)).not.toContain('10028')
  })
  it('frees a hand slot so a third hand asset enters play without discarding', () => {
    let s = tinker(prepared())
    expect(assetSlots(s.assets['01087']!)).toEqual([])
    s = choose(s, 'action.play', { card: 'Machete' })
    expect(Object.values(s.assets).map((a) => a.code)).toEqual(
      expect.arrayContaining(['01087', '01016', '12020']),
    )
    expect(me(s).discard).toEqual([])
  })
  it('reduces a two-handed Tool to one hand slot', () => {
    const s = tinker(prepared('12028'))
    expect(assetSlots(s.assets['12028']!)).toEqual(['hand'])
  })
})
