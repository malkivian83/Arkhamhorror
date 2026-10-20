import { playerCardDef } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, me, patch } from '../dunwich-pilot/testing'
// RR: Skills; Skill Tests ST.7; Discovering Clues.
it.each([
  [3, 3],
  [1, 2],
  [0, 0],
])('uses intellect %s for %s total clues', (intellect, clues) => {
  let s = during(game(), (s) => ({
    ...patch({ hand: ['02150'], skills: { willpower: 3, intellect, combat: 3, agility: 3 } })(s),
    chaosBag: [intellect === 0 ? -4 : 0],
    locations: { ...s.locations, A: { ...s.locations.A!, clues: 8 } },
  }))
  s = choose(s, 'action.investigate')
  s = choose(s, 'choice.commit', { card: playerCardDef('02150')!.name })
  expect(me(s).clues).toBe(clues)
  expect(s.locations.A!.clues).toBe(8 - clues)
  expect(me(s).discard).toContain('02150')
})

// RR: Skills. An intellect test without an investigation does not discover clues.
it('does not grant clues for a different intellect test', () => {
  let s = during(game(), patch({ hand: ['02150'] }), {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'intellect',
    difficulty: 2,
    kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
  })
  s = choose(s, 'choice.commit')
  expect(me(s).clues).toBe(0)
})
// FAQ Double or Nothing: the normal clue and the skill's success effects both repeat.
it('repeats the additional clues with Double or Nothing', () => {
  let s = during(game(), (s) => ({
    ...patch({
      hand: ['02026', '02150'],
      skills: { willpower: 3, intellect: 6, combat: 3, agility: 3 },
    })(s),
    locations: { ...s.locations, A: { ...s.locations.A!, clues: 8 } },
  }))
  s = choose(s, 'action.investigate')
  s = choose(s, 'choice.commit', { card: playerCardDef('02026')!.name })
  s = choose(s, 'choice.commit', { card: playerCardDef('02150')!.name })
  expect(me(s).clues).toBe(6)
  expect(s.locations.A!.clues).toBe(2)
})
