import './index'
import {
  attachedAttackDamageBonus,
  dispatch,
  playerCardDef,
  playableCards,
  type EnemyCard,
  type GameState,
} from '@lcg/engine'
import { choose, during, spawnAt, ghoul } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'

const monster: EnemyCard = { ...ghoul, code: 'test-monster', traits: ['Monster'], health: 10 }
const humanoid: EnemyCard = { ...ghoul, code: 'test-humanoid', traits: ['Humanoid'], health: 10 }
const prepared = (owner = 'b') =>
  during({ ...game(['a', 'b']), interactive: true }, (s) =>
    withAsset(patch({ hand: ['04193', '04193'], resources: 10 })(s), '01016', { owner }),
  )
const play = (s: GameState) => choose(s, 'action.playFast', { card: 'Custom Ammunition' })
const enemy = (s: GameState) => Object.values(s.enemies)[0]!
const attack = (s: GameState, card = '.45 Automatic') => {
  s = choose({ ...s, chaosBag: [0] }, 'ability.fightWith', { card })
  s = choose(s, 'choice.revealToken')
  return choose(s, 'choice.applyResults')
}
// RR: Attach To, Uses, Fight; FAQ: Control of Attachments.
describe('Custom Ammunition', () => {
  it('attaches to a Firearm controlled at your location and places 2 ammo', () => {
    const s = play(prepared())
    expect(playerCardDef('04193')).toMatchObject({ xp: 3, cost: 3, fast: true })
    expect(me(s).resources).toBe(7)
    expect(me(s).actionsRemaining).toBe(3)
    expect(s.assets['01016']).toMatchObject({
      owner: 'b',
      uses: 6,
      upgrades: [{ code: '04193', owner: 'a' }],
    })
  })
  it('requires your turn, a Firearm and its controller at your location', () => {
    const s = prepared()
    expect(playableCards(s, 'a', true)).toContain('04193')
    expect(playableCards({ ...s, activeTurn: 'b' }, 'a', true)).not.toContain('04193')
    expect(playableCards(withAsset({ ...s, assets: {} }, '12020'), 'a', true)).not.toContain(
      '04193',
    )
    const away = patch({ location: 'B' }, 'b')(s)
    expect(playableCards(away, 'a', true)).not.toContain('04193')
  })
  it('is limited to one copy per asset', () => {
    const s = play(prepared('a'))
    expect(playableCards(s, 'a', true)).not.toContain('04193')
    const again = dispatch(
      {
        ...s,
        pending: null,
        queue: [],
        investigators: s.investigators.map((i) =>
          i.id === 'a' ? { ...i, discard: ['04193'] } : i,
        ),
      },
      {
        type: 'AttachEventToAsset',
        asset: '01016',
        investigator: 'a',
        code: '04193',
        trait: 'Firearm',
        atLocation: true,
        limitPerAsset: true,
      },
    )
    expect(again.assets['01016']!.upgrades).toHaveLength(1)
    expect(me(again).discard).toEqual(['04193'])
  })
  it('adds 1 damage to attacks with the host against Monster enemies only', () => {
    const base = play(prepared('a'))
    const hit = (card: EnemyCard, weapon?: string) =>
      enemy(
        attack(
          during(base, (x) => x, spawnAt('A', card, 'a')),
          weapon,
        ),
      ).damageTaken
    expect(hit(monster)).toBe(3)
    expect(hit(humanoid)).toBe(2)
    const unattached = play(prepared('b'))
    const other = during(unattached, (x) => withAsset(x, '12020'), spawnAt('A', monster, 'a'))
    expect(enemy(attack(other, 'Machete')).damageTaken).toBe(2)
  })
  it('gives no bonus to damage redirected by a failed attack on an enemy engaged with another investigator', () => {
    let s = during(play(prepared('a')), (x) => x, spawnAt('A', { ...monster, fight: 10 }, 'b'))
    const before = s.investigators[1]!.damage
    s = attack(s)
    expect(s.investigators[1]!.damage - before).toBe(2)
    expect(enemy(s).damageTaken).toBe(0)
  })
  it('follows the host controller and returns to its owner when discarded', () => {
    let s = play(prepared('a'))
    s = during(s, (x) => x, spawnAt('A', monster, 'a'))
    const test = {
      ...s.skillTest,
      investigator: 'b',
      source: '01016',
      succeeded: true,
      kind: { type: 'fight', enemy: enemy(s).id },
    } as NonNullable<GameState['skillTest']>
    expect(attachedAttackDamageBonus(s, { ...test, investigator: 'a' })).toBe(1)
    expect(attachedAttackDamageBonus(s, test)).toBe(0)
    s = { ...s, assets: { ...s.assets, '01016': { ...s.assets['01016']!, owner: 'b' } } }
    expect(attachedAttackDamageBonus(s, test)).toBe(1)
    expect(attachedAttackDamageBonus(s, { ...test, succeeded: false })).toBe(0)
    s = dispatch({ ...s, pending: null, queue: [] }, { type: 'DiscardAsset', asset: '01016' })
    expect(me(s).discard).toContain('04193')
  })
})
