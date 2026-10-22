import './index'
import { availableAbilities, playerCardDef, type GameState, type Message } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'

const prepared = (hand = ['60162', '60172'], resources = 10) =>
  during({ ...game(), interactive: true }, (s) =>
    withAsset(patch({ hand, resources })(s), '01016', { uses: 1 }),
  )
const attach = (s: GameState) => {
  s = choose(s, 'action.playFast', { card: 'Custom Grip' })
  return choose(s, 'action.playFast', { card: 'Extended Barrel' })
}
const grip = (s: GameState) => choose(s, 'ability.customGrip', { card: '.45 Automatic' })
const customGrip = (s: GameState) =>
  availableAbilities(s, 'a').filter((a) => a.key.endsWith(':60162'))
// RR: Fast, Attachments, Leaves Play, Paying Costs.
describe('Custom Grip', () => {
  it('returns the host to hand, discards its attachments and replays a Firearm', () => {
    let s = grip(attach(prepared()))
    expect(playerCardDef('60162')).toMatchObject({ xp: 0, cost: 1, fast: true })
    expect(s.assets['01016']).toBeUndefined()
    expect(me(s).hand).toEqual(['01016'])
    expect(me(s).discard).toEqual(expect.arrayContaining(['60162', '60172']))
    expect(me(s).actionsRemaining).toBe(3)
    s = choose(s, 'ability.playCard', { card: '.45 Automatic' })
    const played = Object.values(s.assets).find((a) => a.code === '01016')!
    expect(played).toMatchObject({ uses: 4 })
    expect(played.upgrades).toBeUndefined()
    expect(me(s).resources).toBe(10 - 1 - 1 - 4)
    expect(me(s).actionsRemaining).toBe(3)
  })
  it('allows declining or offers only affordable Firearms', () => {
    const declined = choose(grip(attach(prepared())), 'choice.skip')
    expect(me(declined).hand).toEqual(['01016'])
    const poor = grip(attach(prepared(['60162', '60172', '01047'], 5)))
    const labels = poor.pending!.question.choices.map((c) => c.params?.card)
    expect(labels).toContain('.41 Derringer')
    expect(labels).not.toContain('.45 Automatic')
  })
  it('is only available during your turn and outside a skill test', () => {
    const s = attach(prepared())
    expect(customGrip(s)).toHaveLength(1)
    expect(customGrip({ ...s, activeTurn: 'b' })).toHaveLength(0)
    const test: Message = {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'combat',
      difficulty: 2,
      kind: { type: 'effect', source: 'grip-test', onSuccess: [], onFail: [], onFailEach: [] },
    }
    expect(customGrip(during(s, (x) => x, test))).toHaveLength(0)
  })
})
