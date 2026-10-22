import { describe, expect, it } from 'vitest'
import { commit, commitLabels, me, open, resolve } from './testing'

// RR: Committing Cards, discarding committed cards after the test.
describe.each([
  ['01053', 3],
  ['01553', 3],
  ['60319', 3],
  ['02231', 2],
] as const)('%s Opportunist', (code, by) => {
  it('returns to hand when your own test succeeds by enough', () => {
    // Base 3 + 1 wild icon against difficulty 3: success by 1, plus the token.
    let s = resolve(commit(open('combat', [code]), code), by - 1)
    expect(me(s).hand).toContain(code)
    s = resolve(commit(open('combat', [code]), code), by - 2)
    expect(me(s).hand).not.toContain(code)
    expect(me(s).discard).toContain(code)
  })
  it('is not committed to another investigator test', () => {
    const s = open('combat', [code], {}, { players: ['a', 'b'], tester: 'b' })
    expect(commitLabels(s)).not.toContain('Opportunist')
  })
})

it('Unexpected Courage 2 returns to hand only when the test fails', () => {
  let s = resolve(commit(open('combat', ['60526']), '60526'), 'autoFail')
  expect(me(s).hand).toContain('60526')
  s = resolve(commit(open('combat', ['60526']), '60526'))
  expect(me(s).discard).toContain('60526')
})

it('On the Brink returns the other committed cards to hand when the test fails', () => {
  let s = open('combat', ['60569', '01091'])
  s = commit(commit(s, '60569'), '01091')
  s = resolve(s, 'autoFail')
  expect(me(s).hand).toContain('01091')
  expect(me(s).discard).toContain('60569')
  s = resolve(commit(commit(open('combat', ['60569', '01091']), '60569'), '01091'))
  expect(me(s).discard).toEqual(expect.arrayContaining(['60569', '01091']))
})
