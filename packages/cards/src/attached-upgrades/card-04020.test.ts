import './index'
import {
  dispatch,
  playerCardDef,
  playableCards,
  registerPlayerCards,
  resolvingSkillBonus,
  skillTestValue,
  type Message,
  type SkillType,
} from '@lcg/engine'
import { choose, during, spawnAt, ghoul } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'
registerPlayerCards([
  {
    code: 'reliable-item',
    name: 'Test Item',
    type: 'asset',
    class: 'neutral',
    traits: ['Item'],
    icons: {},
  },
])
const prepared = () =>
  during({ ...game(), interactive: true }, (s) =>
    withAsset(patch({ hand: ['04020', '04020'] })(s), 'reliable-item'),
  )
const play = (s = prepared()) => choose(s, 'action.playFast', { card: 'Reliable' })
const test = (skill: SkillType = 'combat'): Message => ({
  type: 'BeginSkillTest',
  investigator: 'a',
  skill,
  difficulty: 2,
  kind: { type: 'effect', source: 'reliable-test', onSuccess: [], onFail: [], onFailEach: [] },
})
const ability = (
  then: Message[],
  actions = 0,
  key = 'reliable-item:test',
): Extract<Message, { type: 'UseAbility' }> => ({
  type: 'UseAbility',
  investigator: 'a',
  key,
  actions,
  provokes: false,
  then,
})
// RR: Triggered Abilities, Modifiers, Skill Tests; constant effects end with resolution.
describe('Reliable', () => {
  it('attaches only to your own Item on your turn, at level 1 and cost 1', () => {
    const s = play()
    expect(playerCardDef('04020')).toMatchObject({ xp: 1, cost: 1, fast: true })
    expect(me(s).resources).toBe(4)
    expect(me(s).actionsRemaining).toBe(3)
    expect(playableCards({ ...s, activeTurn: 'b' }, 'a', true)).not.toContain('04020')
    expect(playableCards({ ...s, assets: {} }, 'a', true)).not.toContain('04020')
    expect(playableCards(withAsset(s, 'reliable-item', { owner: 'b' }), 'a', true)).not.toContain(
      '04020',
    )
  })
  it.each(['willpower', 'intellect', 'combat', 'agility'] as const)(
    'adds stacked bonuses to %s only during the host ability',
    (skill) => {
      let s = play(play())
      expect(resolvingSkillBonus(s, 'a')).toBe(0)
      s = during(s, (x) => x, ability([test(skill)], 1))
      expect(skillTestValue(s).total).toBe(5)
      const ended = dispatch(
        { ...s, pending: null, queue: [], skillTest: null },
        { type: 'EndAssetAbility', asset: 'reliable-item' },
      )
      expect(resolvingSkillBonus(ended, 'a')).toBe(0)
      expect(ended.resolvingAssets).toBeUndefined()
    },
  )
  it('does not boost a basic test or another asset ability', () => {
    for (const message of [test(), ability([test()], 0, 'another:test')]) {
      const s = during(play(), (x) => x, message)
      expect(skillTestValue(s).total).toBe(3)
    }
  })
  it('ends a fast/reaction ability before the surrounding test resolves', () => {
    let s = during(play(), (x) => x, test())
    s = dispatch(
      { ...s, pending: null, queue: [] },
      ability([{ type: 'GainResources', investigator: 'a', amount: 1 }]),
    )
    expect(skillTestValue(s).total).toBe(3)
    expect(s.resolvingAssets).toBeUndefined()
  })
  it('does not multiply one constant effect for nested abilities on the same host', () => {
    const s = during(play(), (x) => x, ability([ability([test()])]))
    expect(s.resolvingAssets).toHaveLength(2)
    expect(skillTestValue(s).total).toBe(4)
    expect(resolvingSkillBonus(JSON.parse(JSON.stringify(s)), 'a')).toBe(1)
  })
  it('loses its effect if the host is discarded as a cost', () => {
    const s = during(play(), (x) => x, {
      ...ability([test()]),
      costs: [{ type: 'DiscardAsset', asset: 'reliable-item' }],
    })
    expect(skillTestValue(s).total).toBe(3)
    expect(me(s).discard).toContain('04020')
  })
})

it('integrates Reliable with a real Machete attack and clears its scope after the test', () => {
  let s = during(
    { ...game(), interactive: true },
    (s) => withAsset(patch({ hand: ['04020'] })(s), '12020'),
    spawnAt('A', { ...ghoul, health: 10 }, 'a'),
  )
  s = choose(s, 'action.playFast', { card: 'Reliable' })
  s = choose(s, 'ability.fightWith', { card: 'Machete' })
  expect(skillTestValue(s).total).toBe(5)
  s = choose(s, 'choice.revealToken')
  s = choose(s, 'choice.applyResults')
  expect(s.resolvingAssets).toBeUndefined()
})

it('applies a newly attached Reliable during an already resolving host ability', () => {
  let s = during(
    prepared(),
    (x) => ({ ...x, investigators: x.investigators.map((i) => ({ ...i, discard: ['04020'] })) }),
    ability([test()]),
  )
  expect(skillTestValue(s).total).toBe(3)
  s = dispatch(
    { ...s, pending: null, queue: [] },
    {
      type: 'AttachEventToAsset',
      asset: 'reliable-item',
      investigator: 'a',
      code: '04020',
      trait: 'Item',
    },
  )
  expect(skillTestValue(s).total).toBe(4)
})
