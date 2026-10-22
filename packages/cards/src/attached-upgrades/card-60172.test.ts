import './index'
import { playerCardDef, playableCards, skillTestValue, type GameState } from '@lcg/engine'
import { choose, during, spawnAt, ghoul } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'

const prepared = () =>
  during({ ...game(), interactive: true }, (s) =>
    withAsset(patch({ hand: ['60172', '60172'] })(s), '01016'),
  )
const play = (s: GameState) => choose(s, 'action.playFast', { card: 'Extended Barrel' })
// RR: Attach To, Fight, Modifiers.
describe('Extended Barrel', () => {
  it('attaches only to your own Firearm on your turn, at level 1 and cost 1', () => {
    const s = play(prepared())
    expect(playerCardDef('60172')).toMatchObject({ xp: 1, cost: 1, fast: true })
    expect(me(s).resources).toBe(4)
    expect(s.assets['01016']!.upgrades).toEqual([{ code: '60172', owner: 'a' }])
    expect(playableCards({ ...s, activeTurn: 'b' }, 'a', true)).not.toContain('60172')
    expect(playableCards(withAsset(s, '01016', { owner: 'b' }), 'a', true)).not.toContain('60172')
    expect(playableCards(withAsset({ ...s, assets: {} }, '12020'), 'a', true)).not.toContain(
      '60172',
    )
  })
  it('adds +1 per copy while attacking with the host, not with another weapon', () => {
    let s = play(play(prepared()))
    s = during(s, (x) => withAsset(x, '12020'), spawnAt('A', { ...ghoul, health: 10 }, 'a'))
    // Base 3 combat, +1 from .45 Automatic and +2 from two Extended Barrels.
    expect(skillTestValue(choose(s, 'ability.fightWith', { card: '.45 Automatic' })).total).toBe(6)
    expect(skillTestValue(choose(s, 'ability.fightWith', { card: 'Machete' })).total).toBe(4)
  })
})
