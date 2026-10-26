// RR: Skill Test Timing ST.2-ST.5, Committing Cards; Timely Intervention.
import { dispatch, skillTestValue, type GameState } from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { holding } from '../basic-events/testing'
import './index'
function begin(by = 'a', copies = 1): GameState {
  const s = holding('60582', {
    enemy: null,
    players: ['a', 'b'],
    hand: copies > 1 ? ['60582'] : [],
  })
  return dispatch(
    { ...s, pending: null, queue: [], chaosBag: [0] },
    {
      type: 'BeginSkillTest',
      investigator: by,
      skill: 'intellect',
      difficulty: 6,
      kind: { type: 'effect', source: 'late', onSuccess: [], onFail: [], onFailEach: [] },
    },
  )
}
const commit = (s: GameState) => choose(s, 'choice.commit', { card: 'Timely Intervention' })
it('can commit normally before tokens are revealed', () => {
  const s = commit(begin())
  expect(skillTestValue(s).icons).toBe(3)
  expect(s.skillTest!.tokens).toEqual([])
})
it('offers a genuine optional late commitment after tokens are revealed and changes the result', () => {
  let s = choose(begin(), 'choice.revealToken')
  expect(s.pending!.question.prompt).toBe('prompt.commitAfterReveal')
  expect(s.skillTest!.tokens).toEqual([0])
  s = commit(s)
  expect(skillTestValue(s).icons).toBe(3)
  s = choose(s, 'choice.applyResults')
  expect(s.skillTest).toBeNull()
  expect(s.investigators[0]!.discard).toContain('60582')
})
it('can decline late commitment without removing the card from hand', () => {
  const s = choose(choose(begin(), 'choice.revealToken'), 'choice.skip')
  expect(s.skillTest!.committed).toEqual([])
  expect(s.investigators[0]!.hand).toContain('60582')
})
it('does not allow another copy after an early commitment', () => {
  const s = choose(commit(begin('a', 2)), 'choice.revealToken')
  expect(s.pending!.question.prompt).not.toBe('prompt.commitAfterReveal')
  expect(s.skillTest!.committed).toHaveLength(1)
})
it('does not offer late commitment from a helper hand', () => {
  const s = choose(begin('b'), 'choice.revealToken')
  expect(s.pending!.question.prompt).not.toBe('prompt.commitAfterReveal')
  expect(s.skillTest!.committed).toEqual([])
})
