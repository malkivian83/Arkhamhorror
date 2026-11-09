// RR: Signature Cards, Weaknesses, Revelation, Threat Area, Skill Tests (fail by),
// Replacement Effects ("instead"), Elimination / end of game experience.
import { treacheryBehavior, type GameState } from '@lcg/engine'
import { choose, labels } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { C, game, me, patch, put, run, use } from './testing'

/** Advance through optional windows until a choice with `label` is offered. */
function until(s: GameState, label: string): GameState {
  for (let n = 0; n < 40 && s.pending && !labels(s).includes(label); n++) {
    const ls = labels(s)
    const next = ['choice.skip', 'choice.pass', 'choice.revealToken', 'choice.continue'].find((l) =>
      ls.includes(l),
    )
    s = next ? choose(s, next) : choose(s, ls[0]!)
  }
  expect(labels(s)).toContain(label)
  return s
}
const web = (s: GameState) => Object.values(s.treacheries).find((t) => t.code === '60253')
const drawn = (s: GameState, code: string) =>
  run(patch(s, { deck: [code, ...me(s).deck] }), { type: 'DrawCards', investigator: C, amount: 1 })

describe('Experimental Psychology', () => {
  it('tests Intellect (2) and heals 1 horror from an investigator or Ally asset here', () => {
    let s = put(patch(game(true), { horror: 2 }, 'b'), '60252')
    s = put(s, '60258', { horror: 1, owner: 'b' }, 'ally')
    s = until(use(s, '60252:test'), 'choice.healHorrorOf')
    expect(s.pending!.question.choices.map((c) => c.params?.name)).toEqual([
      'B',
      'Psychology Student',
    ])
    s = choose(s, 'choice.healHorrorOf', { name: 'Psychology Student' })
    expect(s.assets.ally!.horror).toBe(0)
    // An Ally heal triggers Carolyn but not the investigator bonus.
    expect(labels(s)).toContain('ability.carolynClue')
    expect(labels(s)).not.toContain('ability.experimentalPsychologyBonus')
  })

  it('after you heal horror from an investigator, exhausts to give them +2 next test this round', () => {
    let s = put(patch(game(true), { horror: 2 }, 'b'), '60252')
    s = run(s, { type: 'Heal', investigator: 'b', damage: 0, horror: 1, healer: C })
    s = choose(s, 'ability.experimentalPsychologyBonus', { name: 'B' })
    expect(s.assets['60252']!.exhausted).toBe(true)
    expect(me(s, 'b').nextRoundTestBonus).toEqual({ round: s.round, amount: 2 })
    s = run(s, { type: 'Heal', investigator: 'b', damage: 0, horror: 1, healer: C })
    expect(labels(s)).not.toContain('ability.experimentalPsychologyBonus')
    // Another investigator's heal does not trigger it.
    const other = put(patch(game(true), { horror: 2 }), '60252')
    expect(
      labels(run(other, { type: 'Heal', investigator: C, damage: 0, horror: 1, healer: 'b' })),
    ).not.toContain('ability.experimentalPsychologyBonus')
  })
})

describe('Unbroken Web', () => {
  it('enters the threat area and may replace discovering clues with horror on it', () => {
    let s = drawn(game(), '60253')
    expect(web(s)?.placement).toEqual({ type: 'threatArea', investigator: C })
    const before = s.locations.A!.clues
    s = run(s, { type: 'DiscoverClues', investigator: C, amount: 1 })
    expect(labels(s)).toEqual(['ability.unbrokenWeb', 'choice.skip'])
    s = choose(s, 'ability.unbrokenWeb', { n: 1 })
    expect(me(s).clues).toBe(0)
    expect(s.locations.A!.clues).toBe(before)
    expect(web(s)?.tokens).toBe(1)
    // Skipping discovers the clue normally.
    s = choose(run(s, { type: 'DiscoverClues', investigator: C, amount: 1 }), 'choice.skip')
    expect(me(s).clues).toBe(1)
    expect(web(s)?.tokens).toBe(1)
  })

  it('places as much horror as clues would be discovered and is discarded at 4', () => {
    let s = drawn(game(), '60253')
    s = {
      ...s,
      locations: { ...s.locations, A: { ...s.locations.A!, clues: 5 } },
    }
    s = choose(
      run(s, { type: 'DiscoverClues', investigator: C, amount: 3 }),
      'ability.unbrokenWeb',
      {
        n: 3,
      },
    )
    expect(web(s)?.tokens).toBe(3)
    s = choose(
      run(s, { type: 'DiscoverClues', investigator: C, amount: 1 }),
      'ability.unbrokenWeb',
      {
        n: 1,
      },
    )
    expect(web(s)).toBeUndefined()
    expect(me(s).discard).toContain('60253')
    // Without clues to discover there is no window.
    const empty = drawn(game(), '60253')
    const none = {
      ...empty,
      locations: { ...empty.locations, A: { ...empty.locations.A!, clues: 0 } },
    }
    expect(run(none, { type: 'DiscoverClues', investigator: C, amount: 1 }).pending).toBeNull()
  })

  it('forced: you earn 2 fewer experience when the game ends or you are eliminated', () => {
    const s = drawn(game(), '60253')
    expect(treacheryBehavior('60253')!.whenGameEnds!(s, web(s)!)).toEqual([
      { type: 'EarnExperience', investigator: C, amount: -2 },
    ])
    const out = run(s, { type: 'EliminateInvestigator', investigator: C })
    expect(out.experience?.find((e) => e.investigator === C)?.bonus).toBe(-2)
  })
})

describe('Lethal Curiosity', () => {
  it('for each point failed, take 1 damage or place 1 of your clues on your location', () => {
    let s = patch(game(), { clues: 1, skills: { ...me(game()).skills, willpower: 2 } })
    s = drawn(s, '60254')
    s = until(s, 'choice.takeDamage')
    // Failed by 2: two separate choices.
    expect(labels(s)).toEqual(['choice.takeDamage', 'choice.placeClue'])
    const clues = s.locations.A!.clues
    s = choose(s, 'choice.placeClue')
    expect(s.locations.A!.clues).toBe(clues + 1)
    expect(me(s).clues).toBe(0)
    // Without clues left, the second point can only be damage.
    expect(s.pending).toBeNull()
    expect(me(s).damage).toBe(1)
  })

  it('does nothing when the test succeeds', () => {
    let s = patch(game(), { skills: { ...me(game()).skills, willpower: 4 } })
    s = drawn(s, '60254')
    for (let n = 0; n < 20 && s.pending; n++) {
      expect(labels(s)).not.toContain('choice.takeDamage')
      s = choose(s, labels(s).includes('choice.skip') ? 'choice.skip' : labels(s)[0]!)
    }
    expect(me(s).damage).toBe(0)
  })
})
