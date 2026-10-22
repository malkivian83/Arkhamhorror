import './index'
import { choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { playableCards, registerScenario } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { game, patch } from '../dunwich-pilot/testing'

// RR: Fast, Discover Clues. The clue may come from any revealed location.
describe('Working a Hunch (2)', () => {
  it('discovers remotely, costs two resources, and spends no action or opportunity attack', () => {
    let s = during(game(), patch({ hand: ['11045'] }), spawnAt('A', ghoul, 'a'))
    s = during(s, (s) => ({
      ...s,
      locations: { ...s.locations, C: { ...s.locations.C!, revealed: true, clues: 2 } },
    }))
    s = choose(s, 'action.playFast', { card: 'Working a Hunch' })
    expect(
      s.pending!.question.choices.map((c) => (c.target?.type === 'location' ? c.target.id : null)),
    ).toEqual(['A', 'C'])
    s = choose(s, 'choice.location', { location: 'Room C' })
    expect(s.investigators[0]!.clues).toBe(1)
    expect(s.investigators[0]!.resources).toBe(3)
    expect(s.investigators[0]!.actionsRemaining).toBe(3)
    expect(s.investigators[0]!.damage).toBe(0)
    expect(s.locations.C!.clues).toBe(1)
  })
  it('is unavailable out of turn, without funds or without clues on a revealed location', () => {
    const s = during(game(['a', 'b']), patch({ hand: ['11045'] }))
    expect(playableCards({ ...s, activeTurn: 'b' }, 'a', true)).not.toContain('11045')
    expect(playableCards(patch({ resources: 1 })(s), 'a', true)).not.toContain('11045')
    expect(
      playableCards(
        { ...s, locations: { ...s.locations, A: { ...s.locations.A!, clues: 0 } } },
        'a',
        true,
      ),
    ).not.toContain('11045')
  })
  it('triggers discovery effects at the selected location', () => {
    registerScenario({
      id: 'hunch-remote-clue',
      forced: (_s, t) =>
        t.type === 'afterDiscoverClues' && t.location === 'C' && t.last
          ? [{ type: 'GainResources', investigator: t.investigator, amount: 1 }]
          : [],
    })
    let s = during(game(), patch({ hand: ['11045'] }))
    s = during(s, (s) => ({
      ...s,
      scenarioId: 'hunch-remote-clue',
      locations: {
        ...s.locations,
        A: { ...s.locations.A!, clues: 0 },
        C: { ...s.locations.C!, revealed: true, clues: 1 },
      },
    }))
    s = choose(s, 'action.playFast', { card: 'Working a Hunch' })
    expect(s.investigators[0]!.resources).toBe(4)
    expect(s.locations.C!.clues).toBe(0)
  })
})
