// RR: Skill Tests ST.1/ST.2/ST.8, Weaknesses; Amanda FAQ 1.8/2.0 and Rules Form 2024.
import { expect, it } from 'vitest'
import {
  canCommitFrom,
  dispatch,
  investigatorBehavior,
  playerCardDef,
  skillTestValue,
  type GameState,
  type Investigator,
  type Message,
} from '@lcg/engine'
import { choose, newTestGame, throughSetup } from '@lcg/engine/testing'
import '../index'
const me = (s: GameState) => s.investigators[0]!
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const patch = (s: GameState, p: Partial<Investigator>): GameState => ({
  ...s,
  investigators: s.investigators.map((i, n) => (n ? i : { ...i, ...p })),
})
const run = (s: GameState, ...m: Message[]) => dispatch(clear(s), ...m)
function game() {
  const s = clear(throughSetup(newTestGame({ players: ['07002', 'b'] })))
  return patch(
    { ...s, interactive: true, activeTurn: '07002', phase: 'investigation', chaosBag: [0] },
    {
      skills: playerCardDef('07002')!.skills!,
      hand: ['01093'],
      discard: [],
      deck: ['01088', '01087', '01089'],
      beneath: [],
      resources: 10,
    },
  )
}
const begin = (
  s: GameState,
  skill: 'intellect' | 'combat' | 'willpower' | 'agility' = 'intellect',
) =>
  run(s, {
    type: 'BeginSkillTest',
    investigator: me(s).id,
    skill,
    difficulty: 2,
    kind: { type: 'effect', source: 'Amanda test', onSuccess: [], onFail: [], onFailEach: [] },
  })
const complete = (s: GameState) => run(s, { type: 'EndSkillTest' })

it('draws, discards the previous card and selects only after the draw has resolved', () => {
  let s = patch(game(), { beneath: ['01087'], hand: ['01088'] })
  s = run(s, { type: 'Forced', trigger: { type: 'investigationPhaseBegins' } })
  expect(me(s).hand).toEqual(['01088', '01088'])
  expect(me(s).discard).toEqual(['01087'])
  expect(me(s).beneath).toEqual([])
  s = choose(s, 'choice.placeInvestigatorBeneath')
  expect(me(s).beneath).toEqual(['01088'])
  expect(me(s).hand).toEqual(['01088'])
})
it.each([['07009'], ['01088', '07009']])('must select Whispers from hand %j', (...hand) => {
  let s = patch(game(), { hand: hand as string[] })
  s = run(s, { type: 'ChooseInvestigatorBeneath', investigator: me(s).id, required: '07009' })
  expect(s.pending!.question.choices.map((c) => c.target)).toEqual([
    { type: 'hand', code: '07009' },
  ])
  s = choose(s, 'choice.placeInvestigatorBeneath')
  expect(me(s).beneath).toEqual(['07009'])
})
it('a weakness drawn at the start of investigation is the mandatory beneath choice', () => {
  const s = run(patch(game(), { deck: ['07009'], beneath: ['01090'] }), {
    type: 'Forced',
    trigger: { type: 'investigationPhaseBegins' },
  })
  expect(me(s).hand).toContain('07009')
  expect(me(s).discard).toContain('01090')
  expect(s.pending!.question.choices.map((c) => c.target)).toEqual([
    { type: 'hand', code: '07009' },
  ])
})
it('cannot commit the same physical beneath card twice', () => {
  let s = begin(patch(game(), { beneath: ['01030'] }))
  s = run(s, {
    type: 'CommitCard',
    investigator: '07002',
    code: '01030',
    fromBeneath: 0,
    mandatory: true,
    byEffect: true,
  })
  expect(s.skillTest!.committed).toHaveLength(1)
})
it('does nothing when there is no card left in hand', () => {
  const s = run(patch(game(), { hand: [] }), {
    type: 'ChooseInvestigatorBeneath',
    investigator: '07002',
    required: '07009',
  })
  expect(me(s).beneath).toEqual([])
})
it.each(['intellect', 'willpower', 'combat', 'agility'] as const)(
  'commits beneath automatically on a %s test and preserves it at ST.8',
  (skill) => {
    let s = begin(patch(game(), { beneath: ['01093'], hand: ['01093'] }), skill)
    expect(s.skillTest!.committed).toMatchObject([{ code: '01093', by: '07002', fromBeneath: 0 }])
    expect(me(s).hand).toEqual(['01093'])
    expect(skillTestValue(s).icons).toBe(2)
    s = complete(s)
    expect(me(s).beneath).toEqual(['01093'])
    expect(me(s).discard).toEqual([])
    s = begin(s, skill)
    expect(s.skillTest!.committed).toHaveLength(1)
  },
)
it.each([
  ['01088', 'agility'],
  ['08024', 'combat'],
  ['08037', 'intellect'],
  ['08065', 'willpower'],
  ['08078', 'willpower'],
] as const)('%s cannot use inactive icons beneath Amanda', (code, skill) => {
  expect(playerCardDef(code)).toBeDefined()
  const s = begin(patch(game(), { beneath: [code] }), skill)
  expect(s.skillTest!.committed).toEqual([])
})
it('respects a title commit limit after the forced commitment', () => {
  let s = begin(patch(game(), { beneath: ['01090'], hand: ['01090'] }))
  expect(s.skillTest!.committed).toHaveLength(1)
  expect(canCommitFrom(s, '07002', '01090')).toBe(false)
  s = run(s, { type: 'CommitCard', investigator: '07002', code: '01090' })
  expect(s.skillTest!.committed).toHaveLength(1)
})
it('only auto-commits in Amanda’s own tests', () => {
  const s = run(patch(game(), { beneath: ['01093'] }), {
    type: 'BeginSkillTest',
    investigator: 'b',
    skill: 'intellect',
    difficulty: 2,
    kind: { type: 'effect', source: 'Amanda test', onSuccess: [], onFail: [], onFailEach: [] },
  })
  expect(s.skillTest!.committed).toEqual([])
})
it('Whispers subtracts icons, including when doubled', () => {
  let s = begin(patch(game(), { beneath: ['07009'] }))
  expect(skillTestValue(s).icons).toBe(-1)
  s = run(s, { type: 'DoubleBeneathIcons', investigator: '07002' })
  expect(skillTestValue(s).icons).toBe(-2)
})
it('elder sign doubles only the beneath copy, including temporary icons, for this test', () => {
  let s = begin(patch(game(), { beneath: ['01030'], hand: ['01030'] }))
  const id = s.skillTest!.committed[0]!.id!
  s = run(
    s,
    { type: 'AddCommittedIcon', commitId: id, icon: 'intellect' },
    { type: 'CommitCard', investigator: '07002', code: '01030' },
  )
  s = run(s, ...investigatorBehavior('07002')!.elderSign!(s, me(s)).immediate!)
  s = choose(s, 'choice.doubleBeneathIcons')
  expect(skillTestValue(s).icons).toBe(5)
  s = begin(patch(complete(s), { hand: ['01093'] }))
  expect(skillTestValue(s).icons).toBe(1)
})
it('elder sign may be declined', () => {
  let s = begin(patch(game(), { beneath: ['01093'] }))
  s = run(s, ...investigatorBehavior('07002')!.elderSign!(s, me(s)).immediate!)
  s = choose(s, 'choice.skip')
  expect(skillTestValue(s).icons).toBe(2)
})
it.each(['ReturnCommittedCard', 'PutCommittedIntoPlay', 'RemoveCommittedCard'] as const)(
  '%s moves the exact beneath copy and preserves a hand duplicate',
  (type) => {
    let s = begin(patch(game(), { beneath: ['01030'], hand: ['01030'] }))
    expect(s.skillTest!.committed).toHaveLength(1)
    s = run(
      s,
      type === 'ReturnCommittedCard'
        ? { type, index: 0 }
        : type === 'PutCommittedIntoPlay'
          ? { type, index: 0, code: '01030', investigator: '07002' }
          : { type, code: '01030', investigator: '07002', exile: true },
    )
    expect(me(s).beneath).toEqual([])
    expect(me(s).hand.filter((c) => c === '01030')).toHaveLength(
      type === 'ReturnCommittedCard' ? 2 : 1,
    )
    s = complete(s)
    expect(me(s).discard).not.toContain('01030')
  },
)
it('an ST.8 return effect takes precedence over keeping the card beneath', () => {
  let s = begin(patch(game(), { beneath: ['01093'] }))
  s = run(
    s,
    { type: 'ReturnCommittedAfterTest', commitId: s.skillTest!.committed[0]!.id! },
    { type: 'EndSkillTest' },
  )
  expect(me(s).beneath).toEqual([])
  expect(me(s).hand).toEqual(['01093', '01093'])
})
it('mandatory Justify the Means waives its additional curse cost even with the pool empty', () => {
  let s = patch(game(), { beneath: ['07306'] })
  s = { ...s, chaosBag: Array(10).fill('curse') }
  s = begin(s)
  expect(s.skillTest!.committed).toMatchObject([{ code: '07306', fromBeneath: 0 }])
  expect(s.skillTest!.autoSucceed).toBe(true)
  expect(s.chaosBag).toHaveLength(10)
})
it('Obscure Studies is offered at initiation and replaces the beneath card before ST.2', () => {
  let s = begin(patch(game(), { beneath: ['01088'], hand: ['07008'], discard: ['07008'] }))
  expect(s.skillTest!.committed).toEqual([])
  s = choose(s, 'ability.playCard')
  expect(me(s).hand).toContain('01088')
  expect(me(s).beneath).toEqual(['07008'])
  expect(me(s).discard).toEqual(['07008'])
  expect(s.skillTest!.committed).toMatchObject([{ code: '07008', fromBeneath: 0 }])
  expect(skillTestValue(s).icons).toBe(3)
  s = complete(s)
  expect(me(s).beneath).toEqual(['07008'])
})
it('cannot play Obscure Studies outside its printed fast opportunity', () => {
  const s = patch(game(), { hand: ['07008'] })
  expect(canCommitFrom(s, '07002', '07008')).toBe(false)
  expect(investigatorBehavior('07002')!.startCommitWindow!(s, me(s))).toEqual([])
})
it('reuses Perception’s successful-test draw on consecutive tests without discarding it', () => {
  let s = patch(game(), { beneath: ['01090'] })
  for (let n = 0; n < 2; n++) {
    s = begin(s)
    const before = me(s).hand.length
    s = choose(s, 'choice.revealToken')
    if (s.pending?.question.choices.some((c) => c.label === 'choice.applyResults'))
      s = choose(s, 'choice.applyResults')
    expect(s.skillTest).toBeNull()
    expect(me(s).hand).toHaveLength(before + 1)
    expect(me(s).beneath).toEqual(['01090'])
    expect(me(s).discard).not.toContain('01090')
  }
})
it('returning a hand copy preserves the distinct committed beneath copy', () => {
  let s = begin(patch(game(), { beneath: ['01030'], hand: ['01030'] }))
  s = run(s, { type: 'CommitCard', investigator: '07002', code: '01030' })
  expect(s.skillTest!.committed).toHaveLength(2)
  s = run(s, { type: 'ReturnCommittedCard', index: 1 })
  expect(me(s).beneath).toEqual(['01030'])
  s = complete(s)
  expect(me(s).hand).toEqual(['01030'])
  expect(me(s).beneath).toEqual(['01030'])
})
