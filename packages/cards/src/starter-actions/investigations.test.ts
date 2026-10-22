import { skillTestValue } from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { clues, holding, me, play, resolve, set } from './testing'

const here = (s: ReturnType<typeof holding>) => s.investigators[0]!.location
const moves = (s: ReturnType<typeof holding>) => s.pending?.question.prompt === 'prompt.chooseMove'

// RR: Investigate; investigation events provoke attacks of opportunity.
describe('Stakeout', () => {
  it.each([
    ['60166', 5, 1, 1],
    ['60179', 6, 2, 0],
  ] as const)('%s investigates and heals horror on success', (code, total, found, horror) => {
    let s = play(set(holding(code, { enemy: null }), { horror: 2 }), code)
    expect(skillTestValue(s).total).toBe(total)
    s = resolve(s)
    expect(me(s)).toMatchObject({ clues: found, horror })
    s = resolve(play(set(holding(code, { enemy: null }), { horror: 2 }), code), 'autoFail')
    expect(me(s)).toMatchObject({ clues: 0, horror: 2 })
  })
})

describe('Clean Sweep', () => {
  it('level 0 may move only after discovering the last clue at the location', () => {
    let s = resolve(play(holding('60364', { enemy: null }), '60364'))
    expect(me(s).clues).toBe(1)
    expect(moves(s)).toBe(false)
    s = resolve(play(clues(holding('60364', { enemy: null }), 'A', 1), '60364'))
    expect(moves(s)).toBe(true)
    s = choose(s, 'action.move', { location: 'Room B' })
    expect(here(s)).toBe('B')
    s = resolve(play(clues(holding('60364', { enemy: null }), 'A', 1), '60364'), 'autoFail')
    expect(moves(s)).toBe(false)
  })
  it('level 2 investigates with agility plus intellect and may move after any result', () => {
    let s = play(holding('60376', { enemy: null }), '60376')
    expect(s.skillTest?.skill).toBe('agility')
    expect(skillTestValue(s).total).toBe(6)
    s = resolve(s)
    expect(me(s).clues).toBe(1)
    expect(moves(s)).toBe(true)
    s = resolve(play(holding('60376', { enemy: null }), '60376'), 'autoFail')
    expect(moves(s)).toBe(true)
    expect(here(choose(s, 'choice.skip'))).toBe('A')
  })
})

describe.each(['60227', '01685'])('%s Seeking Answers', (code) => {
  it('discovers 2 total clues from your location and connecting ones instead', () => {
    let s = resolve(play(clues(holding(code, { enemy: null }), 'B', 1), code))
    expect(me(s).clues).toBe(0)
    // After Room B runs out, the only location left with clues is chosen automatically.
    s = choose(s, 'choice.location', { location: 'Room B' })
    expect(me(s).clues).toBe(2)
    expect(s.locations.B!.clues).toBe(0)
    expect(s.locations.A!.clues).toBe(1)
  })
})
