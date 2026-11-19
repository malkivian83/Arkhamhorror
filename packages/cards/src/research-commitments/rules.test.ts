// RR: Search, Research, Weaknesses, Draw, Commit, Ownership, Skill Tests ST.2/ST.8.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  playerCardDef,
  registerPlayerCards,
  registerPlayerCard,
  canCommitFrom,
  skillTestValue,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, labels } from '@lcg/engine/testing'
import { game, patch, withAsset, me } from '../dunwich-pilot/testing'
import data from '../data/research-commitments.json'
import './index'

const b = (code: string) => playerCardBehavior(code)!
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const base = () => ({
  ...clear(patch({ hand: [], resources: 10, deck: ['01088', '01089', '01090'] })(game(['a', 'b']))),
  interactive: true,
})
const run = (s: GameState, ...m: Message[]) => dispatch(clear(s), ...m)
const begin = (s: GameState, by = 'a') =>
  run(s, {
    type: 'BeginSkillTest',
    investigator: by,
    skill: 'intellect',
    difficulty: 2,
    kind: { type: 'effect', source: 'Research test', onSuccess: [], onFail: [], onFailEach: [] },
  })
const take = (s: GameState, code: string) =>
  choose(s, 'choice.takeCard', { card: playerCardDef(code)!.name })
const research = (s: GameState, code: string) =>
  choose(s, 'choice.useResearch', { card: playerCardDef(code)!.name })
const finish = (s: GameState, success = true) =>
  run(
    {
      ...s,
      skillTest: {
        ...s.skillTest!,
        succeeded: success,
        modifiedSkill: success ? 5 : 0,
      },
    },
    { type: 'EndSkillTest' },
  )
const rook = (s: GameState, top = 9) => {
  s = withAsset(s, '05153')
  const o = b('05153').abilities!(s, s.assets['05153']!, 'a').find((o) => o.params?.n === top)!
  return run(s, ...o.costs!, ...o.then)
}
const search = (s: GameState, top?: number) =>
  run(s, {
    type: 'SearchDeck',
    investigator: 'a',
    ...(top === undefined ? {} : { top }),
    traits: [],
    anyCard: true,
    to: 'hand',
    optional: true,
  })
const weakness = 'research-weakness'
registerPlayerCards([
  {
    code: weakness,
    name: 'Research weakness',
    class: 'neutral',
    type: 'treachery',
    traits: [],
    icons: {},
    weakness: 'basic',
  },
])
registerPlayerCard({ code: weakness })

it.each(data)('$code is a registered distinct design/level', (c) => {
  expect(b(c.code)).toBeDefined()
  expect(playerCardDef(c.code)?.xp).toBe(c.xp)
})

it.each([3, 6, 9])(
  'Rook searches exactly %s, exhausts, spends a secret and draws the chosen card',
  (top) => {
    const cards = Array.from({ length: 9 }, (_, n) => (n === top - 1 ? '01088' : '01089'))
    let s = rook(patch({ deck: cards })(base()), top)
    expect(s.assets['05153']).toMatchObject({ exhausted: true, uses: 2 })
    expect(me(s).actionsRemaining).toBe(3)
    s = take(s, '01088')
    expect(me(s).hand).toEqual(['01088'])
    expect(me(s).deck).toHaveLength(8)
  },
)
it('Rook draws exactly one additional weakness, with a real choice, and preserves physical copies', () => {
  registerPlayerCards([
    {
      code: 'research-weakness-2',
      name: 'Other weakness',
      class: 'neutral',
      type: 'treachery',
      traits: [],
      icons: {},
      weakness: 'basic',
    },
  ])
  let s = rook(patch({ deck: ['01088', weakness, 'research-weakness-2', '01089'] })(base()))
  s = take(s, '01088')
  expect(labels(s)).toHaveLength(2)
  s = take(s, weakness)
  expect(me(s).hand).toEqual(['01088', weakness])
  expect(me(s).deck).toHaveLength(2)
  expect(me(s).deck).toContain('research-weakness-2')
})
it('Rook cannot draw an unseen weakness and still draws a seen one when the ordinary search is declined', () => {
  let s = rook(patch({ deck: ['01088', '01089', '01090', weakness] })(base()), 3)
  s = take(s, '01088')
  expect(me(s).hand).toEqual(['01088'])
  s = choose(rook(patch({ deck: [weakness, '01088'] })(base())), 'choice.skip')
  s = take(s, weakness)
  expect(me(s).hand).toEqual([weakness])
})
it('one Research ability consumes exactly one searched copy; a second copy and other Research cannot react', () => {
  let s = search(patch({ deck: ['06023', '06023', '06278', '01088'] })(base()))
  s = research(s, '06023')
  s = choose(s, 'choice.researchResources')
  expect(me(s).resources).toBe(12)
  expect(me(s).discard).toEqual(['06023'])
  expect(me(s).deck.filter((c) => c === '06023')).toHaveLength(1)
  expect(labels(s)).not.toContain('choice.useResearch')
  expect(Object.values(s.assets).some((a) => a.code === '06278')).toBe(false)
  s = take(s, '01088')
  expect(me(s).hand).toEqual(['01088'])
})
it('Research can put a secret on a controlled secret asset, cannot play Revelation, and does not extend the searched group', () => {
  let s = withAsset(patch({ deck: ['06023', '01088', '01089'] })(base()), '05153')
  s = research(search(s, 1), '06023')
  s = take(s, '05153')
  expect(s.assets['05153']!.uses).toBe(4)
  expect(me(s).hand).toEqual([])
  expect(me(s).deck).toEqual(expect.arrayContaining(['01088', '01089']))
  expect(b('06023').canPlay!(s, 'a')).toBe(false)
})
it('Research is optional, does not trigger during setup or on a look, and only sees cards actually searched', () => {
  const s = patch({ deck: ['01088', '06023'] })(base())
  expect(labels(search(s, 1))).not.toContain('choice.useResearch')
  expect(labels(search({ ...s, phase: 'setup' }))).not.toContain('choice.useResearch')
  let looked = run(s, {
    type: 'InspectDeck',
    investigator: 'a',
    count: 2,
    then: { type: 'PlayerCardEffect', code: 'unregistered-look', investigator: 'a', step: 'look' },
  })
  expect(labels(looked)).not.toContain('choice.useResearch')
  looked = choose(search(s), 'choice.skip')
  expect(me(looked).resources).toBe(10)
})
it('Surprising Find enters its play area, commits compulsorily to the next eligible own test, then draws only on success', () => {
  let s = research(search(patch({ deck: ['06278', '01088'] })(base())), '06278')
  s = choose(s, 'choice.skip')
  const a = Object.values(s.assets).find((a) => a.code === '06278')!
  expect(a).toBeDefined()
  const other = begin(s, 'b')
  expect(other.skillTest!.committed).toEqual([])
  expect(other.assets[a.id]).toBeDefined()
  s = begin(s)
  expect(s.skillTest!.committed).toContainEqual({ code: '06278', by: 'a', research: true })
  expect(s.assets[a.id]).toBeUndefined()
  s = finish(s)
  expect(me(s).discard).toContain('06278')
  expect(me(s).hand).toHaveLength(1)
})
it('Surprising Find discovered during an eligible test commits to that current test (September 2023 ruling)', () => {
  let s = begin(patch({ deck: ['06278', '01088'] })(base()))
  s = research(search(s), '06278')
  expect(s.skillTest!.committed.some((c) => c.code === '06278' && c.research)).toBe(true)
  expect(Object.values(s.assets).some((a) => a.code === '06278')).toBe(false)
})
it.each([true, false])(
  'a normal Surprising Find commitment never receives its Research reward (%s)',
  (success) => {
    let s = begin(patch({ hand: ['06278'] })(base()))
    s = run(s, { type: 'CommitCard', investigator: 'a', code: '06278' })
    s = finish(s, success)
    expect(me(s).hand).toHaveLength(0)
  },
)
it.each([true, false])(
  'Practice commits a Practiced skill from the searched nine and returns only that copy on success (%s)',
  (success) => {
    let s = begin(patch({ deck: ['01090', '01090', '01088'], hand: ['01090'] })(base()))
    s = run(s, { type: 'CommitCard', investigator: 'a', code: '01090' })
    s = run(s, ...b('06197').play!(s, 'a'))
    s = take(s, '01090')
    expect(s.skillTest!.committed.filter((c) => c.code === '01090')).toHaveLength(2)
    expect(s.skillTest!.committed.filter((c) => c.returnAfterSuccess)).toHaveLength(1)
    s = finish(s, success)
    expect(me(s).hand.filter((c) => c === '01090')).toHaveLength(success ? 1 : 0)
    expect(me(s).discard.filter((c) => c === '01090')).toHaveLength(success ? 1 : 2)
    expect(me(s).deck).toContain('01090')
  },
)
it('Practice can commit an additional skill to another investigator, and respects Peril and commit restrictions', () => {
  let s = begin(patch({ deck: ['01090'], hand: ['01090'] })(base()), 'b')
  s = run(s, { type: 'CommitCard', investigator: 'a', code: '01090' })
  s = take(run(s, ...b('06197').play!(s, 'a')), '01090')
  expect(s.skillTest!.committed.filter((c) => c.by === 'a')).toHaveLength(2)
  expect(b('06197').canPlay!({ ...s, skillTest: { ...s.skillTest!, tags: ['peril'] } }, 'a')).toBe(
    false,
  )
})
it('Guided lets the tester decline, searches without paying, then lets its controller pay to commit; limit resets after the test', () => {
  let s = begin(withAsset(patch({ deck: ['01090'] }, 'b')(base()), '07223'), 'b')
  const a = s.assets['07223']!
  let opts = b('07223').testOptions!(s, s.skillTest!, a)
  s = run(s, ...opts[0]!.then)
  expect(s.pending!.investigator).toBe('b')
  s = choose(s, 'choice.researchSearch')
  s = take(s, '01090')
  expect(s.pending!.investigator).toBe('a')
  expect(s.assets[a.id]!.uses).toBe(4)
  s = choose(s, 'choice.researchPay')
  expect(s.assets[a.id]!.uses).toBe(3)
  expect(s.skillTest!.committed).toContainEqual({ code: '01090', by: 'b' })
  opts = b('07223').testOptions!(s, s.skillTest!, s.assets[a.id]!)
  expect(opts).toEqual([])
  s = begin(finish(s))
  expect(b('07223').testOptions!(s, s.skillTest!, s.assets[a.id]!)).toHaveLength(1)
})
it('Captivating Discovery can place zero clues, or place up to three and choose two cards per clue without drawing them', () => {
  const original = patch({
    clues: 2,
    deck: ['01088', '01089', '01090', '01091', '01092', '01093', '01094'],
  })(base())
  let s = run(original, ...b('09047').play!(original, 'a'))
  s = choose(s, 'choice.researchClues', { n: 2 })
  const before = s.locations[me(s).location!]!.clues
  for (const c of ['01088', '01089', '01090', '01091']) s = take(s, c)
  expect(me(s).clues).toBe(0)
  expect(me(s).hand).toEqual(['01088', '01089', '01090', '01091'])
  expect(s.locations[me(s).location!]!.clues).toBe(before)
  expect(me(s).deck).toHaveLength(3)
  s = choose(run(original, ...b('09047').play!(original, 'a')), 'choice.researchClues', { n: 0 })
  expect(me(s).clues).toBe(2)
  expect(me(s).hand).toEqual([])
})
it('Copycat commits from a remote investigator’s discard under the committer’s control and returns to the actual owner’s bottom', () => {
  let s = begin(
    patch({ discard: ['01090'], location: 'B' }, 'b')(patch({ hand: ['60330'] })(base())),
  )
  s = run(s, { type: 'CommitCard', investigator: 'a', code: '60330' })
  s = choose(s, 'choice.researchCopy', { card: playerCardDef('01090')!.name, name: 'B' })
  expect(s.skillTest!.committed).toContainEqual({
    code: '01090',
    by: 'a',
    owner: 'b',
    toDeckBottom: true,
  })
  expect(s.investigators[1]!.discard).not.toContain('01090')
  s = finish(s, false)
  expect(s.investigators[1]!.deck.at(-1)).toBe('01090')
  expect(me(s).discard).toEqual(['60330'])
})
it('Gift of Nodens reacts only after committing to your own test, pays a non-weakness discard and bottoms the chosen Survivor skill', () => {
  let s = begin(withAsset(patch({ hand: ['01090', '01088'], discard: ['03039'] })(base()), '11094'))
  const trigger = { type: 'afterCommit' as const, by: 'a', tester: 'a' }
  const options = b('11094').reactions!(s, trigger, s.assets['11094']!)
  expect(options).toHaveLength(1)
  expect(options[0]!.limit).toEqual({ per: 'round' })
  s = run(s, ...options[0]!.then)
  s = take(s, '03039')
  s = take(s, '01088')
  expect(me(s).discard).toContain('01088')
  expect(s.skillTest!.committed).toContainEqual({ code: '03039', by: 'a', toDeckBottom: true })
  s = finish(s, false)
  expect(me(s).deck.at(-1)).toBe('03039')
  expect(b('11094').reactions!(s, { ...trigger, tester: 'b' }, s.assets['11094']!)).toEqual([])
})
it('Bestow converts all printed icons on the specific copy, works at a connecting location, and respects Peril', () => {
  let s = begin(
    withAsset(patch({ hand: ['01091'], location: 'B' }, 'b')(base()), '09032', { owner: 'b' }),
  )
  const a = s.assets['09032']!
  const opts = b('09032').testOptions!(s, s.skillTest!, a)
  expect(opts).toHaveLength(1)
  expect(labels(s)).toContain('choice.researchBestow')
  const before = skillTestValue(s).total
  s = run(s, ...opts[0]!.then)
  expect(s.skillTest!.committed).toContainEqual({ code: '01091', by: 'b', wildIcons: true })
  expect(skillTestValue(s).total).toBe(before + 2)
  expect(s.assets[a.id]!.uses).toBe(3)
  expect(
    b('09032').testOptions!(
      { ...s, skillTest: { ...s.skillTest!, tags: ['peril'] } },
      { ...s.skillTest!, tags: ['peril'] },
      s.assets[a.id]!,
    ),
  ).toEqual([])
  expect(canCommitFrom(s, 'b', '01091')).toBe(false)
})
it('pending search choices and copy ownership survive a JSON round trip', () => {
  const s = search(patch({ deck: ['06023', '01088'] })(base()))
  const restored = JSON.parse(JSON.stringify(s)) as GameState
  expect(research(restored, '06023')).toEqual(research(s, '06023'))
})

it('a search-cancelling weakness stops both Rook and Research without granting either reward', () => {
  registerPlayerCards([
    {
      code: 'research-dead-end',
      name: 'Dead end',
      type: 'treachery',
      class: 'neutral',
      traits: [],
      weakness: 'basic',
    },
  ])
  registerPlayerCard({ code: 'research-dead-end', cancelsSearch: true })
  const s = rook(patch({ deck: ['research-dead-end', '06023', '01088'] })(base()))
  expect(labels(s)).not.toContain('choice.useResearch')
  expect(me(s).hand).toContain('research-dead-end')
  expect(me(s).hand).not.toContain('01088')
  expect(me(s).resources).toBe(10)
  expect(me(s).deck).toEqual(expect.arrayContaining(['06023', '01088']))
})
it('a Research Find waits through ineligible tests and provides no draw when its eventual test fails', () => {
  let s = withAsset(base(), '06278')
  s = begin(s)
  expect(s.skillTest!.committed.some((c) => c.research)).toBe(true)
  s = finish(s, false)
  expect(me(s).hand).toEqual([])
  s = withAsset(base(), '06278')
  registerPlayerCards([
    {
      code: 'research-only-card',
      name: 'Exclusive skill',
      type: 'skill',
      class: 'neutral',
      traits: [],
      icons: { wild: 1 },
    },
  ])
  registerPlayerCard({ code: 'research-only-card', exclusiveCommit: true })
  s = begin(s)
  // An existing exclusive commitment prevents all further commitments.
  s = withAsset(
    { ...s, skillTest: { ...s.skillTest!, committed: [{ code: 'research-only-card', by: 'a' }] } },
    '06278',
  )
  const a = s.assets['06278']!
  expect(b('06278').forced!(s, { type: 'afterSkillTestInitiated', investigator: 'a' }, a)).toEqual(
    [],
  )
})
it('returning a borrowed committed card before test end returns it to its owner without duplicating it at cleanup', () => {
  let s = begin(patch({ discard: ['01090'] }, 'b')(base()))
  s = run(s, {
    type: 'CommitCard',
    investigator: 'a',
    code: '01090',
    from: 'discard',
    fromInvestigator: 'b',
    toDeckBottom: true,
    byEffect: true,
  })
  s = run(s, { type: 'ReturnCommittedCard', index: 0 })
  expect(s.investigators[1]!.hand.filter((c) => c === '01090')).toHaveLength(1)
  s = finish(s, false)
  expect(s.investigators[1]!.hand.filter((c) => c === '01090')).toHaveLength(1)
  expect(me(s).hand).toEqual([])
  expect(s.investigators[1]!.deck).not.toContain('01090')
})
it('Gift chooses the skill before paying its discard and cannot pay with a weakness', () => {
  let s = begin(
    withAsset(patch({ hand: ['04201', weakness], discard: ['03039'] })(base()), '11094'),
  )
  const options = b('11094').reactions!(
    s,
    { type: 'afterCommit', by: 'a', tester: 'a' },
    s.assets['11094']!,
  )
  s = run(s, ...options[0]!.then)
  expect(s.pending!.question.choices.map((c) => c.params?.card)).toEqual([
    playerCardDef('03039')!.name,
  ])
  s = take(s, '03039')
  expect(s.pending!.question.choices.map((c) => c.params?.card)).toEqual([
    playerCardDef('04201')!.name,
  ])
  s = take(s, '04201')
  expect(s.skillTest!.committed.some((c) => c.code === '03039')).toBe(true)
  expect(s.skillTest!.committed.some((c) => c.code === '04201')).toBe(false)
})
it('Rook is available in fast windows during another investigator’s ordinary test, but never their Peril test', () => {
  const s = begin(withAsset(base(), '05153'), 'b'),
    a = s.assets['05153']!
  expect(b('05153').fastOptions!(s, a)).toHaveLength(3)
  expect(
    b('05153').fastOptions!({ ...s, skillTest: { ...s.skillTest!, tags: ['peril'] } }, a),
  ).toEqual([])
})
