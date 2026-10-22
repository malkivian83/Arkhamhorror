import { playableCards, type ChaosToken } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, patch } from '../dunwich-pilot/testing'

function test(hand = ['01080'], difficulty = 5, token: ChaosToken = 0, resources = 3, by = 'a') {
  const s = during(game(['a', 'b']), patch({ hand, resources }, by))
  return during({ ...s, chaosBag: [token] }, (s) => s, {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'intellect',
    difficulty,
    kind: { type: 'investigate', location: 'A' },
  })
}
// RR: Skill Test Timing, steps 6–7. Boost the original value before applying results.
describe('Lucky (0)', () => {
  it('turns a failure into a success, pays once and spends no action', () => {
    const s = choose(test(), 'ability.playCard', { card: 'Lucky!' })
    expect(s.investigators[0]!.clues).toBe(1)
    expect(s.investigators[0]!.resources).toBe(2)
    expect(s.investigators[0]!.discard).toContain('01080')
    expect(s.investigators[0]!.actionsRemaining).toBe(3)
  })
  it('reopens the window for a second copy only if still failing', () => {
    let s = choose(test(['01080', '01080'], 7), 'ability.playCard', { card: 'Lucky!' })
    s = choose(s, 'ability.playCard', { card: 'Lucky!' })
    expect(s.investigators[0]!.clues).toBe(1)
    expect(s.investigators[0]!.resources).toBe(1)
    const passed = choose(test(['01080', '01080']), 'ability.playCard', { card: 'Lucky!' })
    expect(passed.investigators[0]!.hand).toContain('01080')
    expect(passed.skillTest).toBeNull()
  })
  it('does not turn a deeply negative value into zero before adding the bonus', () => {
    const s = choose(test(['01080'], 1, -6), 'ability.playCard', { card: 'Lucky!' })
    expect(s.investigators[0]!.clues).toBe(0)
  })
  it('is absent on success, autofail, insufficient resources, and another investigator test', () => {
    for (const s of [
      test(['01080'], 3),
      test(['01080'], 0, -6),
      test(['01080'], 5, 'autoFail'),
      test(['01080'], 5, 0, 0),
      test(['01080'], 5, 0, 3, 'b'),
    ])
      expect(s.pending?.question.choices.some((c) => c.params?.card === 'Lucky!')).toBeFalsy()
    expect(playableCards(during(game(), patch({ hand: ['01080'] })), 'a', true)).not.toContain(
      '01080',
    )
  })
  it('can be declined without paying or changing the result', () => {
    const s = choose(test(), 'choice.skip')
    expect(s.investigators[0]!.clues).toBe(0)
    expect(s.investigators[0]!.hand).toContain('01080')
    expect(s.investigators[0]!.resources).toBe(3)
  })
})
