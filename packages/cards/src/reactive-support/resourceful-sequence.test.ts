// RR: Skill Tests, Effects: each committed skill resolves against the updated discard pile.
import { expect, it } from 'vitest'
import { choose, during } from '@lcg/engine/testing'
import { game, me, patch } from '../dunwich-pilot/testing'
it('resolves two Resourceful copies against the current discard pile', () => {
  let s = during(game(), patch({ hand: ['03039', '03039'], discard: ['01072', '01075'] }), {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'combat',
    difficulty: 3,
    kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
  })
  s = choose(s, 'choice.commit')
  s = choose(s, 'choice.commit')
  s = choose(s, 'choice.reactiveRecover', { card: 'Leather Coat' })
  expect(me(s).hand).toEqual(expect.arrayContaining(['01072', '01075']))
  expect(me(s).discard).toEqual(['03039', '03039'])
})
