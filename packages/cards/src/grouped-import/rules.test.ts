// RR: Skill Tests ST.2, Golden Rule, Reveal, Search, Discard and Weakness.
// Official Daredevil FAQ: effects can exceed the ordinary one-card helper allowance.
import {
  canCommitFrom,
  dispatch,
  getInvestigator,
  registerPlayerCard,
  registerPlayerCards,
  type GameState,
} from '@lcg/engine'
import { chooseWithConsent } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { holding } from '../basic-events/testing'
import { patch } from '../dunwich-pilot/testing'
import './index'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
registerPlayerCards([
  {
    code: 'group-skill',
    name: 'Rogue skill',
    type: 'skill',
    class: 'rogue',
    traits: [],
    icons: { wild: 1 },
  },
  {
    code: 'group-limit',
    name: 'Limited skill',
    type: 'skill',
    class: 'rogue',
    traits: [],
    icons: { wild: 1 },
    commitLimit: 1,
  },
  {
    code: 'group-wrong',
    name: 'Agility skill',
    type: 'skill',
    class: 'rogue',
    traits: [],
    icons: { agility: 1 },
  },
  {
    code: 'group-neutral',
    name: 'Neutral skill',
    type: 'skill',
    class: 'neutral',
    traits: [],
    icons: { wild: 1 },
  },
  {
    code: 'group-event',
    name: 'Event',
    type: 'event',
    class: 'rogue',
    traits: [],
    icons: { wild: 1 },
  },
  {
    code: 'group-weakness',
    name: 'Weakness',
    type: 'treachery',
    class: 'neutral',
    traits: [],
    weakness: 'basic',
  },
])
registerPlayerCard({
  code: 'group-skill',
  onCommit: (_s, by) => [{ type: 'GainResources', investigator: by, amount: 1 }],
})
registerPlayerCard({
  code: 'group-weakness',
  cancelsSearch: true,
  revelation: (_s, by) => [{ type: 'GainResources', investigator: by, amount: 99 }],
})
function begin(code: string, deck: string[], by = 'a'): GameState {
  let s = holding(code, { enemy: null, players: ['a', 'b'] })
  s = patch(
    { hand: [code], deck, discard: ['group-neutral'] },
    by,
  )(patch({ hand: by === 'a' ? [code] : [] })(s))
  return dispatch(clear(s), {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'intellect',
    difficulty: 1,
    kind: { type: 'effect', source: 'group', onSuccess: [], onFail: [], onFailEach: [] },
  })
}
const commit = (s: GameState, by = 'a', name = 'Daredevil') =>
  chooseWithConsent(s, by === 'a' ? 'choice.commit' : 'choice.commitFrom', { card: name })
const codes = (s: GameState) => s.skillTest!.committed.map((c) => c.code)
it.each(['60318', '06240'])(
  'commits the first eligible Rogue skill and resolves its onCommit effect (%s)',
  (code) => {
    const s = commit(
      begin(code, ['group-event', 'group-neutral', 'group-wrong', 'group-skill', '12088']),
    )
    expect(codes(s)).toEqual([code, 'group-skill'])
    expect(getInvestigator(s, 'a').resources).toBe(11)
    expect(getInvestigator(s, 'a').hand).not.toContain('group-skill')
    expect(getInvestigator(s, 'a').deck).not.toContain('group-skill')
  },
)
it('level zero discards other cards, shuffles only weaknesses and never draws their revelations', () => {
  const s = commit(
    begin('60318', ['group-event', 'group-weakness', 'group-wrong', 'group-skill', '12088']),
  )
  const i = getInvestigator(s, 'a')
  expect(i.discard).toEqual(['group-neutral', 'group-event', 'group-wrong'])
  expect([...i.deck].sort()).toEqual(['group-weakness', '12088'].sort())
  expect(i.resources).toBe(11)
  expect(i.horror).toBe(0)
})
it('level two shuffles all other revealed cards without discarding or searching', () => {
  const s = commit(
    begin('06240', ['group-event', 'group-weakness', 'group-wrong', 'group-skill', '12088']),
  )
  const i = getInvestigator(s, 'a')
  expect(i.discard).toEqual(['group-neutral'])
  expect([...i.deck].sort()).toEqual(
    ['group-event', 'group-weakness', 'group-wrong', '12088'].sort(),
  )
  expect(i.resources).toBe(11)
})
it.each(['60318', '06240'])(
  'stops at an empty deck without reshuffling the old discard or taking horror (%s)',
  (code) => {
    const s = commit(begin(code, []))
    expect(codes(s)).toEqual([code])
    expect(getInvestigator(s, 'a').discard).toEqual(['group-neutral'])
    expect(getInvestigator(s, 'a').horror).toBe(0)
  },
)
it('level zero without a target discards non-weaknesses and returns the weakness', () => {
  const s = commit(begin('60318', ['group-event', 'group-weakness']))
  expect(getInvestigator(s, 'a').discard).toEqual(['group-neutral', 'group-event'])
  expect(getInvestigator(s, 'a').deck).toEqual(['group-weakness'])
})
it('can add an extra skill when committed to another investigator test', () => {
  const s = commit(begin('06240', ['group-skill'], 'b'), 'b')
  expect(s.skillTest!.committed).toEqual([
    { code: '06240', by: 'b' },
    { code: 'group-skill', by: 'b' },
  ])
  expect(getInvestigator(s, 'b').resources).toBe(6)
  expect(canCommitFrom(s, 'b', 'group-neutral')).toBe(false)
  expect(canCommitFrom(s, 'b', 'group-neutral', 'hand', true)).toBe(true)
})
it('does not bypass a title limit', () => {
  let s = begin('06240', ['group-limit', 'group-skill'])
  s = { ...s, skillTest: { ...s.skillTest!, committed: [{ code: 'group-limit', by: 'a' }] } }
  s = commit(s)
  expect(codes(s).filter((c) => c === 'group-limit')).toHaveLength(1)
  expect(codes(s)).toContain('group-skill')
})
it('does not bypass the Peril restriction', () => {
  let s = begin('06240', ['group-skill'], 'b')
  s = clear({ ...s, skillTest: { ...s.skillTest!, tags: ['peril'] } })
  s = dispatch(s, { type: 'RevealUntilCommittableSkill', investigator: 'b', faction: 'rogue' })
  expect(codes(s)).toEqual([])
  expect(getInvestigator(s, 'b').deck).toEqual(['group-skill'])
})
it('chains another Daredevil without searching the set-aside cards or losing cards', () => {
  const s = commit(
    begin('06240', ['group-event', '06240', 'group-neutral', 'group-skill', '12088']),
  )
  expect(codes(s)).toEqual(['06240', '06240', 'group-skill'])
  expect([...getInvestigator(s, 'a').deck].sort()).toEqual(
    ['group-event', 'group-neutral', '12088'].sort(),
  )
})
it('suspends and resumes the same commitment deterministically after serialization', () => {
  const initial = begin('06240', ['group-event', 'group-skill', '12088'])
  const restored = JSON.parse(JSON.stringify(initial)) as GameState
  expect(commit(restored)).toEqual(commit(initial))
})

it('does not bypass an exclusive card already committed to the test', () => {
  registerPlayerCards([
    {
      code: 'group-exclusive',
      name: 'Exclusive',
      type: 'skill',
      class: 'neutral',
      traits: [],
      icons: { wild: 1 },
    },
  ])
  registerPlayerCard({ code: 'group-exclusive', exclusiveCommit: true })
  let s = begin('06240', ['group-skill'])
  s = clear({
    ...s,
    skillTest: { ...s.skillTest!, committed: [{ code: 'group-exclusive', by: 'a' }] },
  })
  s = dispatch(s, { type: 'RevealUntilCommittableSkill', investigator: 'a', faction: 'rogue' })
  expect(codes(s)).toEqual(['group-exclusive'])
  expect(getInvestigator(s, 'a').deck).toEqual(['group-skill'])
})
