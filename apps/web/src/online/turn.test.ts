import { expect, it } from 'vitest'
import { turnNotice } from './turn'

it('announces the turn only when the decision passes to the own investigator', () => {
  const notice = turnNotice()
  expect(notice('12004', '12001', 2)).toBe(false)
  expect(notice('12001', '12001', 2)).toBe(true)
  expect(notice('12001', '12001', 2)).toBe(false)
  expect(notice(null, '12001', 2)).toBe(false)
  expect(notice('12001', '12001', 2)).toBe(false)
  expect(notice('12004', '12001', 2)).toBe(false)
  expect(notice('12001', '12001', 2)).toBe(true)
})

it('announces an own decision on load but never in a solo game', () => {
  expect(turnNotice()('12001', '12001', 3)).toBe(true)
  expect(turnNotice()('12001', '12001', 1)).toBe(false)
})
