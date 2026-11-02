// RR: Skill Tests ST.2–ST.8, Ignore/Cancel, Costs, Uses, Myriad, Decks.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  playerCardDef,
  registerScenario,
  canPlayByEffect,
  playableCards,
  type GameState,
  type Message,
  type ChaosToken,
} from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { game, patch, me, withAsset } from '../dunwich-pilot/testing'
import { startingExperienceSpent } from '../survivor-deck/card-08125'
import './index'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const start = (hand: string[] = []): GameState => {
  const s = patch({
    hand,
    resources: 10,
    clues: 3,
    deck: ['01088', '01088', '01088', '01088'],
    discard: [],
    skills: { willpower: 8, intellect: 8, combat: 8, agility: 8 },
  })(clear(game()))
  return {
    ...s,
    interactive: true,
    chaosBag: [0],
    locations: { ...s.locations, A: { ...s.locations.A!, revealed: true, clues: 8 } },
  }
}
const run = (s: GameState, ms: Message[]) => ms.reduce((s, m) => dispatch(clear(s), m), s)
const begin = (s: GameState, extra: Partial<Extract<Message, { type: 'BeginSkillTest' }>> = {}) =>
  dispatch(clear(s), {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'willpower',
    difficulty: 3,
    kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
    ...extra,
  })
const commit = (s: GameState, code: string) =>
  dispatch(clear(s), { type: 'CommitCard', investigator: 'a', code })
const b = (code: string) => playerCardBehavior(code)!
it.each(['02190', '04198'])(
  '%s ignores the chosen token’s effects but leaves its reveal observable',
  (code) => {
    registerScenario({
      id: 'token-ignore-test',
      tokenEffect: () => ({
        modifier: -8,
        onFail: [{ type: 'LoseResources', investigator: 'a', amount: 5 }],
        immediate: [{ type: 'LoseResources', investigator: 'a', amount: 2 }],
      }),
    })
    let s = begin({ ...start([code]), scenarioId: 'token-ignore-test', chaosBag: ['skull'] })
    s = commit(s, code)
    if (code === '02190') s = choose(s, 'chaosTokenName.skull')
    s = dispatch(clear(s), { type: 'RevealChaosToken' })
    expect(s.skillTest!.tokens).toEqual(['skull'])
    expect(s.skillTest!.tokenModifier).toBe(0)
    expect(s.skillTest!.tokenOnFail).toEqual([])
    expect(me(s).resources).toBe(10)
    expect(s.chaosBag).toEqual([])
    s = dispatch(clear(s), { type: 'EndSkillTest' })
    expect(s.chaosBag).toEqual(['skull'])
  },
)
it('Defiance 0 leaves other symbols untouched and its lasting effect survives skill cancellation', () => {
  let s = commit(begin({ ...start(['02190']), chaosBag: ['cultist'] }), '02190')
  s = choose(s, 'chaosTokenName.skull')
  expect(s.skillTest!.ignoredTokenEffects).toEqual(['skull'])
  s = dispatch(clear(s), { type: 'CancelCommittedSkills' })
  expect(s.skillTest!.ignoredTokenEffects).toEqual(['skull'])
})
it('Torrent of Power pays up to three charges, records icons per copy and permits zero', () => {
  let s = withAsset(begin(start(['03235', '03235'])), '01060', { uses: 4 })
  s = commit(s, '03235')
  s = choose(s, 'choice.tokenSkillCharge')
  s = choose(s, 'choice.tokenSkillCharge')
  s = choose(s, 'choice.skip')
  expect(s.assets['01060']!.uses).toBe(2)
  expect(s.skillTest!.committed[0]!.iconBonus).toEqual({ willpower: 2, wild: 2 })
  s = commit(s, '03235')
  s = choose(s, 'choice.skip')
  expect(s.skillTest!.committed[1]!.iconBonus).toBeUndefined()
  expect(s.skillTest!.committed[0]!.id).not.toBe(s.skillTest!.committed[1]!.id)
})
it.each([
  ['even', 0],
  ['odd', -3],
  ['symbol', 'skull'],
] as const)('Prescient predicts %s and can recover a Spell after the test', (name, token) => {
  let s = patch({ discard: ['01060', '01088'] })(commit(begin(start(['60419'])), '60419'))
  s = choose(s, `choice.tokenSkill${name[0]!.toUpperCase() + name.slice(1)}`)
  const t = { ...s.skillTest!, tokens: [token] as ChaosToken[] }
  const ms = b('60419').afterCommittedTestEnds!(s, t, false, 'a')
  s = run(s, ms)
  expect(
    s.pending!.question.choices.filter((c) => c.label === 'choice.tokenSkillRecover'),
  ).toHaveLength(1)
  s = choose(s, 'choice.tokenSkillRecover')
  expect(me(s).hand).toContain('01060')
  expect(me(s).discard).not.toContain('01060')
  expect(b('60419').afterCommittedTestEnds!(s, { ...t, tokens: [] }, true, 'a')).toEqual([])
})
it('Analysis pays its committer’s clue before canceling and drawing again', () => {
  let s = commit(
    begin({ ...start(['09049']), chaosBag: ['autoFail'] }, { skill: 'intellect' }),
    '09049',
  )
  s = dispatch(clear(s), { type: 'RevealChaosToken' })
  const o = b('09049').committedReactions!(
    s,
    { type: 'afterRevealingChaosToken', investigator: 'a', token: 'autoFail' },
    'a',
  )[0]!
  s = run(s, o.then)
  expect(me(s).clues).toBe(2)
  expect(s.locations.A!.clues).toBe(9)
  expect(s.skillTest!.tokens).toEqual([])
  expect(s.skillTest!.revealing?.token).toBe('autoFail')
  s = patch({ clues: 0 })(s)
  expect(
    b('09049').committedReactions!(
      s,
      { type: 'afterRevealingChaosToken', investigator: 'a', token: 'autoFail' },
      'a',
    ),
  ).toEqual([])
})
it('Strong-Armed adds damage only with a Melee/Ranged asset and can pay damage to redraw', () => {
  let s = begin(withAsset(start(['10031']), '01020'), { skill: 'combat' })
  s = {
    ...s,
    skillTest: { ...s.skillTest!, source: '01020', kind: { type: 'fight', enemy: 'target' } },
  }
  s = commit(s, '10031')
  expect(b('10031').committedAttackDamage!(s, s.skillTest!, 'a')).toBe(1)
  const t = { ...s.skillTest!, revealing: { token: -1 as ChaosToken, face: -1 as ChaosToken } }
  s = { ...s, skillTest: t }
  const o = b('10031').committedReactions!(
    s,
    { type: 'afterRevealingChaosToken', investigator: 'a', token: -1 },
    'a',
  )[0]!
  expect(o.then[0]).toMatchObject({ type: 'TakeDamage', damage: 1 })
  expect(o.then[1]).toMatchObject({ type: 'CancelRevealedToken', redraw: true })
  expect(
    b('10031').committedAttackDamage!(
      s,
      {
        ...t,
        kind: { type: 'effect', source: 'no attack', onSuccess: [], onFail: [], onFailEach: [] },
      },
      'a',
    ),
  ).toBe(0)
})
it('Confidence counts canceled and ignored reveals, including reveals outside the test, and caps at three extra icons', () => {
  let s = commit(begin({ ...start(['11097']), chaosBag: [-1] }), '11097')
  expect(s.skillTest!.revealCount).toBe(0)
  s = dispatch(clear(s), { type: 'RevealChaosToken' })
  expect(s.skillTest!.revealCount).toBe(1)
  // Canceling a resolved token is not legal; hold the actual token in its reveal window instead.
  s = { ...s, skillTest: { ...s.skillTest!, tokens: [], revealing: { token: -1, face: -1 } } }
  s = dispatch(clear(s), { type: 'CancelRevealedToken', redraw: true })
  expect(s.skillTest!.revealCount).toBe(2)
  expect(b('11097').additionalIcons!(s, s.skillTest!, 'a', 'committed')).toEqual({ wild: 1 })
  s = dispatch(clear(s), { type: 'RevealChaosToken', token: 0, ignored: -2 })
  expect(s.skillTest!.revealCount).toBe(4)
  expect(b('11097').additionalIcons!(s, s.skillTest!, 'a', 'committed')).toEqual({ wild: 3 })
  s = dispatch(
    { ...clear(s), chaosBag: [0] },
    {
      type: 'RevealTokenOutsideTest',
      investigator: 'a',
      then: { type: 'PlayerCardEffect', code: '11097', investigator: 'a', step: 'none' },
    },
  )
  expect(s.skillTest!.revealCount).toBe(5)
  expect(b('11097').additionalIcons!(s, s.skillTest!, 'a', 'committed')).toEqual({ wild: 3 })
})
it('Confidence does not add a zero-token bonus and ordinary tests keep their old state shape', () => {
  const s = begin(start())
  expect(s.skillTest!.revealCount).toBeUndefined()
  expect(b('11097').additionalIcons!(s, s.skillTest!, 'a', 'committed')).toEqual({ wild: 0 })
})
it('Eldritch Whispers places up to two charges OR secrets among its owner’s assets', () => {
  let s = withAsset(withAsset(begin(start()), '01060', { uses: 1 }), '04230', { uses: 1 })
  const t = { ...s.skillTest!, tokens: ['autoFail'] as ChaosToken[] }
  s = run(s, b('60471').afterCommittedTest!(s, t, false, 'a'))
  s = choose(s, 'choice.tokenSkillAddSecret')
  expect(s.assets['04230']!.uses).toBe(2)
  expect(s.pending!.question.choices.some((c) => c.label === 'choice.tokenSkillAddCharge')).toBe(
    false,
  )
  s = choose(s, 'choice.tokenSkillAddSecret')
  expect(s.assets['04230']!.uses).toBe(3)
  expect(s.assets['01060']!.uses).toBe(1)
  expect(b('60471').afterCommittedTest!(s, { ...t, tokens: [0] }, true, 'a')).toEqual([])
})
it.each([false, true])(
  'Quick-Witted shuffles only other copies, including when its own copy goes to the deck: %s',
  (toDeckBottom) => {
    let s = patch({ discard: ['11042', '11042'] })(begin(start(['11042']), { skill: 'intellect' }))
    expect(b('11042').additionalIcons!(s, s.skillTest!, 'a', 'hand')).toEqual({
      intellect: 2,
      agility: 2,
    })
    s = commit(s, '11042')
    if (toDeckBottom)
      s = {
        ...s,
        skillTest: {
          ...s.skillTest!,
          committed: s.skillTest!.committed.map((c) => ({ ...c, toDeckBottom: true })),
        },
      }
    s = { ...s, skillTest: { ...s.skillTest!, succeeded: true, modifiedSkill: 8 } }
    s = dispatch(clear(s), { type: 'EndSkillTest' })
    s = choose(s, 'choice.tokenSkillShuffle')
    expect(me(s).discard.filter((c) => c === '11042')).toHaveLength(toDeckBottom ? 0 : 1)
    expect(me(s).deck.filter((c) => c === '11042')).toHaveLength(toDeckBottom ? 3 : 2)
  },
)
it('Three Aces needs three copies committed by one investigator, rewards once, and skips token reveal', () => {
  let s = begin(start(['06199', '06199', '06199']))
  s = commit(s, '06199')
  s = commit(s, '06199')
  expect(s.skillTest!.autoSucceed).not.toBe(true)
  s = commit(s, '06199')
  expect(s.skillTest).toMatchObject({ autoSucceed: true, noTokens: true })
  expect(me(s).resources).toBe(13)
  expect(me(s).hand).toHaveLength(3)
  expect(b('06199').effect!(s, 'a', 'aces', {})).toEqual([])
  s = dispatch(clear(s), { type: 'RevealChaosToken' })
  expect(s.skillTest!.tokens).toEqual([])
  expect(s.chaosBag).toEqual([0])
})
it.each([0, 1, 2])(
  'Fortuitous Discovery uses the %s other discarded copies for cost, bonus and additional clues',
  (n) => {
    let s = patch({ clues: 0, discard: Array(n).fill('06034') })(start(['06034']))
    s = dispatch(
      { ...clear(s), interactive: false },
      { type: 'PlayCard', investigator: 'a', code: '06034' },
    )
    expect(me(s).resources).toBe(10 - n)
    expect(me(s).clues).toBe(n + 1)
    expect(playerCardDef('06034')!.printedCostX).toBe(true)
  },
)
it('A Glimmer of Hope is playable only from discard and returns every discarded copy', () => {
  let s = patch({ discard: ['06245', '06245'], hand: ['06245'] })(start())
  expect(canPlayByEffect(s, 'a', '06245', 'hand')).toBe(false)
  expect(canPlayByEffect(s, 'a', '06245', 'discard')).toBe(true)
  s = dispatch(clear(s), { type: 'PlayCard', investigator: 'a', code: '06245', from: 'discard' })
  expect(me(s).discard).not.toContain('06245')
  expect(me(s).hand.filter((c) => c === '06245')).toHaveLength(3)
})
it.each([false, true])(
  'Fortuitous Discovery excludes its played discard copy from X even with a copy in hand: %s',
  (inHand) => {
    let s = withAsset(
      patch({ hand: inHand ? ['06034'] : [], discard: ['06034', '06034'], clues: 0 })(start()),
      '01014',
    )
    s = dispatch(
      { ...clear(s), interactive: false },
      { type: 'PlayCard', investigator: 'a', code: '06034', from: 'discard' },
    )
    expect(me(s).resources).toBe(9)
    if (s.skillTest) s = dispatch(clear(s), { type: 'ResolveSkillTest' })
    expect(me(s).clues).toBe(2)
  },
)
it('the play menu offers an affordable discard copy even when the hand copy costs more', () => {
  const s = withAsset(
    patch({ hand: ['06034'], discard: ['06034', '06034'], resources: 1 })(start()),
    '01014',
  )
  expect(playableCards(s, 'a', false)).toContain('06034')
  expect(canPlayByEffect(s, 'a', '06034', 'hand')).toBe(false)
  expect(canPlayByEffect(s, 'a', '06034', 'discard')).toBe(true)
  let played = dispatch(clear(s), { type: 'PlayCard', investigator: 'a', code: '06034' })
  if (played.pending?.question.prompt === 'prompt.playFrom')
    played = choose(played, 'choice.playFromDiscard')
  expect(me(played).resources).toBe(0)
  expect(me(played).hand).toContain('06034')
})
it('returning the played event with Wendy removes its bottom copy and preserves earlier deck copies', () => {
  let s = withAsset(
    patch({ discard: ['06245', '06245'], hand: [], deck: ['06245', '01088'] })(start()),
    '01014',
  )
  s = dispatch(clear(s), { type: 'PlayCard', investigator: 'a', code: '06245', from: 'discard' })
  expect(me(s).hand).toEqual(['06245', '06245'])
  expect(me(s).deck).toEqual(['06245', '01088'])
})
it('Myriad counts only one copy at the same level toward starting experience', () => {
  expect(startingExperienceSpent(['11042', '11042', '11042', '06199', '06199'])).toBe(2)
})
it('discard shuffling consumes real copies and never duplicates an absent card', () => {
  let s = patch({ deck: [], discard: ['11042'] })(start())
  s = dispatch(clear(s), {
    type: 'ShuffleCardsIntoDeck',
    investigator: 'a',
    cards: ['11042', '11042'],
    fromDiscard: true,
  })
  expect(me(s).discard).toEqual([])
  expect(me(s).deck).toEqual(['11042'])
})
