import './index'
import { choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { playableCards, type ChaosToken } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { game, patch } from '../dunwich-pilot/testing'

// RR: Fight, Skill Test Timing. The resources are gained before the combat test.
describe('Clean Them Out (0)', () => {
  for (const token of [0, 'autoFail'] as ChaosToken[])
    it(`gains resources on ${token} without opportunity attacks`, () => {
      let s = during(
        game(),
        patch({ hand: ['60111'], resources: 0 }),
        spawnAt('A', { ...ghoul, health: 3 }, 'a'),
      )
      s = choose({ ...s, chaosBag: [token] }, 'action.play', { card: 'Clean Them Out' })
      expect(s.investigators[0]!.resources).toBe(2)
      expect(s.investigators[0]!.actionsRemaining).toBe(2)
      expect(s.investigators[0]!.damage).toBe(0)
      expect(Object.values(s.enemies)[0]!.damageTaken).toBe(token === 0 ? 1 : 0)
      expect(s.investigators[0]!.discard).toContain('60111')
    })
  it('makes the resources available before committing and identifies the test as an event', () => {
    let s = during(
      game(),
      patch({ hand: ['60111', '12092'], resources: 0 }),
      spawnAt('A', ghoul, 'a'),
    )
    s = choose(s, 'action.play', { card: 'Clean Them Out' })
    expect(s.pending!.question.prompt).toBe('prompt.commitCards')
    expect(s.investigators[0]!.resources).toBe(2)
    expect(s.skillTest!.source).toBe('60111')
    expect(s.skillTest!.skill).toBe('combat')
  })
  it('requires a legal enemy and does not permit an unengaged aloof enemy', () => {
    let s = during(game(), patch({ hand: ['60111'] }))
    expect(playableCards(s, 'a', false)).not.toContain('60111')
    s = during(s, (x) => x, spawnAt('A', { ...ghoul, keywords: ['aloof'] }))
    expect(playableCards(s, 'a', false)).not.toContain('60111')
  })
})
