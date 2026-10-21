import { playerCardBehavior, registerScenario, type GameState } from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game } from '../dunwich-pilot/testing'
import { movement } from './testing'

describe('optional movement continuations', () => {
  it('recomputes connections after every move and stops at the remaining budget', () => {
    let s = movement(game(), '60317', 3)
    s = choose(s, 'choice.pilotMove', { location: 'Room B' })
    s = JSON.parse(JSON.stringify(s)) as GameState
    s = choose(s, 'choice.pilotMove', { location: 'Room C' })
    expect(s.pending!.question.choices.filter((c) => c.label === 'choice.pilotMove')).toHaveLength(
      1,
    )
    s = choose(s, 'choice.pilotMove', { location: 'Room B' })
    expect(s.pending?.question.choices.some((c) => c.label === 'choice.pilotMove')).toBeFalsy()
    expect(s.investigators[0]!.actionsRemaining).toBe(3)
  })
  it('offers no illegal destination and permits stopping without spending the budget', () => {
    registerScenario({ id: 'movement-blocked', canEnter: () => false })
    const s = movement({ ...game(), scenarioId: 'movement-blocked' }, '60317', 3)
    expect(s.pending?.question.choices.some((c) => c.label === 'choice.pilotMove')).toBeFalsy()
    const stopped = choose(movement(game(), '60317', 3), 'choice.skip')
    expect(stopped.investigators[0]!.location).toBe('A')
  })
  it('caps Nimble at three moves, gives no moves at margin zero, and ignores the action kind', () => {
    const s = game()
    const test = {
      investigator: 'a',
      difficulty: 1,
      modifiedSkill: 9,
      kind: { type: 'effect' },
    } as NonNullable<GameState['skillTest']>
    const hook = playerCardBehavior('60317')!.afterCommittedTestEnds!
    expect(hook(s, test, true, 'b')[0]).toMatchObject({ investigator: 'b', data: { remaining: 3 } })
    expect(hook(s, { ...test, modifiedSkill: 1 }, true, 'b')).toEqual([])
    for (const code of ['01081', '02235'])
      expect(playerCardBehavior(code)!.afterCommittedTest!(s, test, true, 'b')).toEqual([])
  })
})
