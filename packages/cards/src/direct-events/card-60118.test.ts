import './index'
import { choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { playableCards } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { game, patch } from '../dunwich-pilot/testing'

// RR: Target, Attacks of Opportunity. Another investigator is required.
describe('Stand Together (0)', () => {
  it('chooses one other investigator and gives exactly two resources to each', () => {
    let s = during(game(['a', 'b', 'c']), patch({ hand: ['60118'], resources: 0 }))
    s = choose(s, 'action.play', { card: 'Stand Together' })
    expect(
      s.pending!.question.choices.map((c) =>
        c.target?.type === 'investigator' ? c.target.id : null,
      ),
    ).toEqual(['b', 'c'])
    s = choose(s, 'choice.equipmentInvestigator', { name: 'C' })
    expect(s.investigators.map((i) => i.resources)).toEqual([2, 5, 7])
    expect(s.investigators[0]!.actionsRemaining).toBe(2)
    expect(s.investigators[0]!.discard).toContain('60118')
  })
  it('cannot be played alone, with a distant or eliminated partner, or without a location', () => {
    const s = during(game(['a', 'b']), patch({ hand: ['60118'] }))
    for (const state of [
      game(),
      patch({ location: 'B' }, 'b')(s),
      patch({ eliminated: true }, 'b')(s),
      patch({ location: null })(s),
    ])
      expect(playableCards(state, 'a', false)).not.toContain('60118')
  })
  it('provokes an attack before granting resources and does not resolve if it defeats the player', () => {
    let s = during(
      game(['a', 'b']),
      patch({ hand: ['60118'], damage: 7, resources: 0 }),
      spawnAt('A', ghoul, 'a'),
    )
    s = choose(s, 'action.play', { card: 'Stand Together' })
    expect(s.investigators[0]!.eliminated).toBe(true)
    expect(s.investigators[0]!.resources).toBe(0)
    expect(s.investigators[1]!.resources).toBe(5)
  })
})
