// RR: Committing Cards, Peril, Cannot, Skill Tests ST.2/ST.6/ST.8, Limits, Slots.
import { expect, it } from 'vitest'
import {
  dispatch,
  registerPlayerCards,
  registerPlayerCard,
  canCommitFrom,
  investigatorBehavior,
  playerCardBehavior,
  playerCardDef,
  skillTestValue,
  type GameState,
  type Message,
} from '@lcg/engine'
import { newTestGame, throughSetup, choose } from '@lcg/engine/testing'
import '../index'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const base = (): GameState => {
  const s = clear(throughSetup(newTestGame({ players: ['03002', 'b'] })))
  return {
    ...s,
    activeTurn: '03002',
    interactive: true,
    chaosBag: [0],
    investigators: s.investigators.map((i) => ({
      ...i,
      hand: [],
      deck: ['01088', '01089', '01090'],
      discard: [],
      resources: 5,
      damage: 0,
      horror: 0,
      location: 'A',
      actionsRemaining: 3,
    })),
  }
}
const patch = (
  s: GameState,
  id: string,
  v: Partial<GameState['investigators'][number]>,
): GameState => ({
  ...s,
  investigators: s.investigators.map((i) => (i.id === id ? { ...i, ...v } : i)),
})
const me = (s: GameState, id = '03002') => s.investigators.find((i) => i.id === id)!
const run = (s: GameState, ...m: Message[]) => dispatch(clear(s), ...m)
const asset = (s: GameState, code: string): GameState => ({
  ...s,
  assets: {
    ...s.assets,
    [code]: { id: code, code, owner: '03002', uses: 0, damage: 0, horror: 0, exhausted: false },
  },
})
const begin = (s: GameState, by = '03002', difficulty = 0, tags?: string[]) =>
  run(s, {
    type: 'BeginSkillTest',
    investigator: by,
    skill: 'intellect',
    difficulty,
    kind: { type: 'investigate', location: me(s, by).location! },
    ...(tags ? { tags } : {}),
  })
const has = (s: GameState, label: string) =>
  !!s.pending?.question.choices.some((c) => c.label === label)
const commit = (s: GameState, code = '01093', id = '03002') =>
  dispatch(
    { ...s, pending: null },
    { type: 'CommitCard', investigator: id, code },
    { type: 'CommitWindow' },
  )
const group = (s: GameState, cards = me(s).hand) =>
  dispatch(
    { ...s, pending: null },
    { type: 'CommitCardGroup', investigator: '03002', cards },
    { type: 'CommitWindow' },
  )
const name = (c: string) => playerCardDef(c)!.name
const mind = (s: GameState) => asset(s, '03010')
const king = (s: GameState) => asset(s, '03011')
const finish = (s: GameState) => choose(choose(s, 'choice.revealToken'), 'choice.applyResults')
const skipReaction = (s: GameState) => {
  while (has(s, 'ability.minhIcon') || has(s, 'ability.advancedTest')) s = choose(s, 'choice.skip')
  return s
}
it('Minh adds one wild icon to the exact committed copy, including duplicate printed codes', () => {
  let s = begin(patch(base(), '03002', { hand: ['01093', '01093'] }))
  s = commit(s)
  s = choose(s, 'ability.minhIcon', { card: name('01093') })
  s = commit(s)
  expect(s.skillTest!.committed.map((c) => c.iconBonus?.wild ?? 0)).toEqual([1, 0])
  expect(skillTestValue(s).icons).toBe(5)
  expect(has(s, 'ability.minhIcon')).toBe(false)
})
it('Minh can boost a local helper card and the limit belongs to each contributor per round', () => {
  let s = begin(
    patch(patch(base(), '03002', { hand: ['01093'] }), 'b', { hand: ['01093', '01093'] }),
  )
  s = commit(s, '01093', 'b')
  s = choose(s, 'ability.minhIcon')
  s = commit(s)
  s = choose(s, 'ability.minhIcon')
  expect(skillTestValue(s).icons).toBe(6)
  s = finish(s)
  s = begin(s)
  s = commit(s, '01093', 'b')
  expect(has(s, 'ability.minhIcon')).toBe(false)
})
it('Minh cannot boost another contributor at a different location, or make an iconless card committable', () => {
  let s = begin(
    patch(patch(base(), '03002', { location: 'B', hand: ['01089'] }), 'b', { hand: ['01093'] }),
    'b',
  )
  expect(canCommitFrom(s, '03002', '01089')).toBe(false)
  s = commit(s, '01093', 'b')
  expect(has(s, 'ability.minhIcon')).toBe(false)
})
it('Analytical Mind allows one remote contribution even while exhausted, and Minh can boost her own remote card', () => {
  let s = mind(patch(patch(base(), '03002', { hand: ['01093', '01093'] }), 'b', { location: 'B' }))
  s.assets['03010']!.exhausted = true
  s = begin(s, 'b')
  expect(canCommitFrom(s, '03002', '01093')).toBe(true)
  s = commit(s)
  s = choose(s, 'ability.minhIcon')
  expect(skillTestValue(s).icons).toBe(3)
  expect(canCommitFrom(s, '03002', '01093')).toBe(false)
})
it('remote commitments still obey Peril, location and ordinary helper limits', () => {
  const s = patch(patch(base(), '03002', { hand: ['01093'] }), 'b', { location: 'B' })
  expect(canCommitFrom(begin(s, 'b'), '03002', '01093')).toBe(false)
  expect(canCommitFrom(begin(mind(s), 'b', 0, ['peril']), '03002', '01093')).toBe(false)
  expect(canCommitFrom(begin(mind(patch(s, 'b', { location: null })), 'b'), '03002', '01093')).toBe(
    false,
  )
})
it('Analytical Mind exhausts and draws after exactly one card, without waiting for the token', () => {
  let s = commit(begin(mind(patch(base(), '03002', { hand: ['01093'] }))))
  s = choose(s, 'ability.advancedTest', { card: 'Analytical Mind' })
  expect(s.assets['03010']!.exhausted).toBe(true)
  expect(me(s).hand).toEqual(['01088'])
  expect(s.skillTest!.tokens).toEqual([])
})
it('Analytical Mind is not offered after a second card or another investigator contribution', () => {
  let s = skipReaction(commit(begin(mind(patch(base(), '03002', { hand: ['01093', '01093'] })))))
  s = commit(s)
  expect(has(s, 'ability.advancedTest')).toBe(false)
  const t = { type: 'afterCommit' as const, by: 'b', tester: '03002' }
  expect(playerCardBehavior('03010')!.reactions!(s, t, s.assets['03010']!)).toEqual([])
})
it('The King in Yellow enters with a hand slot and cannot be discarded, returned, exiled or removed by another effect', () => {
  let s = run(patch(base(), '03002', { deck: ['03011', '01088'] }), {
    type: 'DrawCards',
    investigator: '03002',
    amount: 1,
  })
  const a = Object.values(s.assets).find((a) => a.code === '03011')!
  expect(a).toBeDefined()
  expect(playerCardDef(a.code)!.slots).toEqual(['hand'])
  for (const m of [
    { type: 'DiscardAsset', asset: a.id },
    { type: 'ReturnAssetToHand', asset: a.id },
    { type: 'ExileCard', asset: a.id, investigator: '03002', code: '03011' },
    { type: 'RemoveAssetFromGame', asset: a.id },
  ] as Message[])
    s = run(s, m)
  expect(s.assets[a.id]).toBeDefined()
  expect(me(s).discard).not.toContain('03011')
})
it.each([1, 2])(
  'The King in Yellow rejects a direct group of %i cards without losing any physical cards',
  (n) => {
    const s = begin(king(patch(base(), '03002', { hand: ['01093', '01093', '01090'] })))
    const next = run(s, {
      type: 'CommitCardGroup',
      investigator: '03002',
      cards: me(s).hand.slice(0, n),
    })
    expect(next.skillTest!.committed).toHaveLength(0)
    expect(me(next).hand).toEqual(me(s).hand)
    expect(canCommitFrom(s, '03002', '01093')).toBe(false)
  },
)
it('the minimum group picker cannot finish early and commits the whole selection before reaction windows', () => {
  let s = begin(mind(king(patch(base(), '03002', { hand: ['01093', '01093', '01090'] }))))
  s = choose(s, 'choice.commitGroup')
  s = choose(s, 'choice.commitGroupAdd', { card: name('01093') })
  expect(has(s, 'choice.commitGroupFinish')).toBe(false)
  s = choose(s, 'choice.commitGroupAdd', { card: name('01093') })
  expect(has(s, 'choice.commitGroupFinish')).toBe(false)
  s = choose(s, 'choice.commitGroupAdd', { card: name('01090') })
  expect(me(s).hand).toHaveLength(3)
  s = choose(s, 'choice.commitGroupFinish')
  expect(s.skillTest!.committed).toHaveLength(3)
  expect(me(s).hand).toHaveLength(0)
  expect(has(s, 'ability.advancedTest')).toBe(false)
  expect(has(s, 'ability.minhIcon')).toBe(true)
})
it('cancelling group selection leaves hand and commitments unchanged, also after JSON reload', () => {
  let s = begin(king(patch(base(), '03002', { hand: ['01093', '01093', '01090'] })))
  s = choose(s, 'choice.commitGroup')
  s = choose(s, 'choice.commitGroupAdd', { card: name('01093') })
  s = JSON.parse(JSON.stringify(s)) as GameState
  s = choose(s, 'choice.skip')
  expect(me(s).hand).toHaveLength(3)
  expect(s.skillTest!.committed).toHaveLength(0)
})
it('an impossible group is not offered and duplicate copies cannot exceed the physical hand', () => {
  let s = begin(king(patch(base(), '03002', { hand: ['01093', '01039', '01089'] })))
  expect(has(s, 'choice.commitGroup')).toBe(false)
  s = run(s, { type: 'CommitCardGroup', investigator: '03002', cards: ['01093', '01093', '01090'] })
  expect(s.skillTest!.committed).toHaveLength(0)
  expect(me(s).hand).toHaveLength(3)
})
it('Analytical Mind cannot override the King to commit three cards as a helper', () => {
  const s = begin(
    mind(
      king(
        patch(patch(base(), '03002', { hand: ['01093', '01093', '01090'] }), 'b', {
          location: 'B',
        }),
      ),
    ),
    'b',
  )
  const next = run(s, {
    type: 'CommitCardGroup',
    investigator: '03002',
    cards: ['01093', '01093', '01090'],
  })
  expect(next.skillTest!.committed).toHaveLength(0)
})
it('six matching icons on successful testing allow the King own reaction to discard it', () => {
  let s = begin(king(patch(base(), '03002', { hand: ['01093', '01093', '01090'] })))
  s = group(s)
  s = skipReaction(s)
  s = choose(s, 'choice.revealToken')
  s = choose(s, 'ability.advancedTest', { card: 'The King in Yellow' })
  expect(s.assets['03011']).toBeUndefined()
  expect(me(s).discard).toContain('03011')
  expect(s.pending?.question.choices.some((c) => c.label === 'choice.applyResults')).toBe(true)
})
it('Minh wild icon contributes to the six required by the King', () => {
  let s = begin(king(patch(base(), '03002', { hand: ['01093', '01090', '01039'] })))
  s = group(s)
  s = choose(s, 'ability.minhIcon')
  expect(skillTestValue(s).icons).toBe(6)
  s = choose(s, 'choice.revealToken')
  expect(has(s, 'ability.advancedTest')).toBe(true)
})
it.each([
  { difficulty: 30, cards: ['01093', '01093', '01090'] },
  { difficulty: 0, cards: ['01093', '01039', '01039'] },
])(
  'the King remains after failure or fewer than six matching icons: $difficulty',
  ({ difficulty, cards }) => {
    let s = begin(king(patch(base(), '03002', { hand: cards })), '03002', difficulty)
    s = skipReaction(group(s, cards))
    s = choose(s, 'choice.revealToken')
    expect(has(s, 'ability.advancedTest')).toBe(false)
    expect(s.assets['03011']).toBeDefined()
  },
)
it('Minh elder sign returns a selected skill after the test, retaining its effects and physical owner', () => {
  let s = begin(patch(patch(base(), '03002', { hand: ['01093'] }), 'b', { hand: ['01093'] }))
  s = skipReaction(commit(s, '01093', 'b'))
  s = skipReaction(commit(s))
  const e = investigatorBehavior('03002')!.elderSign!(s, me(s))
  expect(e.modifier).toBe(1)
  s = dispatch({ ...s, pending: null }, ...(e.immediate ?? []), { type: 'CommitWindow' })
  s = choose(s, 'choice.minhReturn', { card: name('01093') })
  expect(me(s, 'b').hand).toHaveLength(0)
  expect(s.skillTest!.committed).toHaveLength(2)
  s = finish(s)
  expect(me(s, 'b').hand.filter((c) => c === '01093')).toHaveLength(1)
  expect(me(s).discard).toContain('01093')
})
it('a selected elder-sign skill returns on failure too, but assets/events are never candidates', () => {
  let s = begin(patch(base(), '03002', { hand: ['01093', '01033'] }), '03002', 30)
  s = skipReaction(commit(s))
  s = skipReaction(commit(s, '01033'))
  const e = investigatorBehavior('03002')!.elderSign!(s, me(s))
  s = dispatch({ ...s, pending: null }, ...(e.immediate ?? []), { type: 'CommitWindow' })
  expect(s.pending!.question.choices.filter((c) => c.label === 'choice.minhReturn')).toHaveLength(1)
  s = choose(s, 'choice.minhReturn')
  s = finish(s)
  expect(me(s).hand).toContain('01093')
  expect(me(s).discard).toContain('01033')
})

it('the King permits additional individual contributions after a legal group of three', () => {
  let s = begin(king(patch(base(), '03002', { hand: ['01093', '01093', '01039', '01033'] })))
  s = skipReaction(group(s, ['01093', '01093', '01039']))
  expect(canCommitFrom(s, '03002', '01033')).toBe(true)
  s = commit(s, '01033')
  expect(s.skillTest!.committed).toHaveLength(4)
})
it('Minh limit resets in a new round and is retained when saving the current round', () => {
  let s = choose(
    commit(begin(patch(base(), '03002', { hand: ['01093', '01093'] }))),
    'ability.minhIcon',
  )
  s = finish(s)
  s = JSON.parse(JSON.stringify(s)) as GameState
  s = begin(s)
  expect(has(commit(s), 'ability.minhIcon')).toBe(false)
  s = { ...s, round: s.round + 1 }
  expect(has(commit(s), 'ability.minhIcon')).toBe(true)
})
it('a returned Perception still draws for its success before returning after the test', () => {
  let s = skipReaction(commit(begin(patch(base(), '03002', { hand: ['01090'] })), '01090'))
  const e = investigatorBehavior('03002')!.elderSign!(s, me(s))
  s = dispatch({ ...s, pending: null }, ...(e.immediate ?? []), { type: 'CommitWindow' })
  s = choose(s, 'choice.minhReturn')
  s = finish(s)
  expect(me(s).hand).toEqual(['01088', '01090'])
  expect(me(s).discard).not.toContain('01090')
})

registerPlayerCards([
  {
    code: 'minh-limit',
    name: 'Limited skill',
    type: 'skill',
    class: 'neutral',
    traits: [],
    icons: { wild: 1 },
    commitLimit: 1,
  },
  {
    code: 'minh-exclusive',
    name: 'Exclusive skill',
    type: 'skill',
    class: 'neutral',
    traits: [],
    icons: { wild: 5 },
  },
])
registerPlayerCard({ code: 'minh-limit' })
registerPlayerCard({ code: 'minh-exclusive', exclusiveCommit: true })
it.each([
  ['minh-limit', 'minh-limit', '01093'],
  ['minh-exclusive', '01093', '01093'],
  ['01093', '01093', 'minh-exclusive'],
])('atomic groups retain title limits and exclusive-card restrictions: %s/%s/%s', (...cards) => {
  const s = begin(king(patch(base(), '03002', { hand: cards })))
  const next = run(s, { type: 'CommitCardGroup', investigator: '03002', cards })
  expect(next.skillTest!.committed).toHaveLength(0)
  expect(me(next).hand).toEqual(cards)
})
