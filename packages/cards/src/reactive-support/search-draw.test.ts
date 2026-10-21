// RR: Draw, Search: drawing a found card also opens its after-draw window.
import { expect, it } from 'vitest'
import { registerPlayerCard } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { game, me, patch, play, withAsset } from '../dunwich-pilot/testing'
registerPlayerCard({
  code: 'search-draw-observer',
  forced: (_s, t, a) =>
    t.type === 'afterDrawCard' && t.investigator === a.owner
      ? [{ type: 'GainResources', investigator: a.owner, amount: 1 }]
      : [],
})
it('emits the draw window when Rabbit’s Foot draws the found card', () => {
  let s = during(
    game(),
    (s) =>
      withAsset(
        withAsset(
          patch({
            hand: [],
            deck: ['01072', '01075'],
            skills: { willpower: 0, intellect: 0, combat: 0, agility: 0 },
          })(s),
          'search-draw-observer',
        ),
        '50010',
      ),
    {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'willpower',
      difficulty: 2,
      kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
    },
  )
  s = choose(s, 'ability.reactiveSearch')
  s = choose(s, 'choice.takeCard', { card: 'Leather Coat' })
  expect(me(s).resources).toBe(6)
})
it('distinguishes drawing a found card from adding one to hand', () => {
  let s = during(game(), (s) =>
    withAsset(patch({ deck: ['01016', '12089'] })(s), 'search-draw-observer'),
  )
  s = play(s, '02184')
  expect(me(s).resources).toBe(10 - 1)
  s = during(s, patch({ deck: ['01016', '12089'] }))
  s = play(s, '03026')
  s = choose(s, 'choice.takeCard', { card: '.45 Automatic' })
  expect(me(s).resources).toBe(10 - 2 + 1)
})
