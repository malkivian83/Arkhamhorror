import { expect, it } from 'vitest'
import { verticalThreadBlocked } from './mapThreads'

it('routes Lobby–Tunnel around Alpha without inventing an Alpha–Tunnel connection', () => {
  const positions = new Map<string, [number, number]>([
    ['lobby', [2, 0]],
    ['alpha', [2, 1]],
    ['tunnel', [2, 2]],
  ])
  expect(verticalThreadBlocked(positions, 'lobby', 'tunnel')).toBe(true)
  expect(verticalThreadBlocked(positions, 'tunnel', 'lobby')).toBe(true)
  expect(verticalThreadBlocked(positions, 'alpha', 'tunnel')).toBe(false)
  positions.delete('alpha')
  expect(verticalThreadBlocked(positions, 'lobby', 'tunnel')).toBe(false)
})
