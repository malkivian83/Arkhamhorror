// RR: Complete Resolution, Myriad, Healing, Clues, Constant Abilities, Skill Tests.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  cardsInHand,
  registerScenario,
  type GameState,
  type Message,
  type Treachery,
} from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { game, patch, me, withAsset } from '../dunwich-pilot/testing'
import './index'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const start = (hand: string[] = [], players = ['a']): GameState => {
  const s = patch({
    hand,
    deck: ['01088', '01088', '01088'],
    discard: [],
    resources: 10,
    clues: 0,
  })(clear(game(players)))
  return {
    ...s,
    interactive: true,
    chaosBag: [0],
    locations: { ...s.locations, A: { ...s.locations.A!, revealed: true, clues: 5 } },
  }
}
const b = (code: string) => playerCardBehavior(code)!
const run = (s: GameState, ms: Message[]) => ms.reduce((s, m) => dispatch(clear(s), m), s)
const play = (s: GameState, code: string, from?: 'hand' | 'discard') =>
  dispatch(clear(s), { type: 'PlayCard', investigator: 'a', code, ...(from ? { from } : {}) })
const begin = (s: GameState) =>
  dispatch(clear(s), {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'intellect',
    difficulty: 2,
    kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
  })
it('Easy Mark completes its resource/draw effects before chaining and spends just the first action', () => {
  let s = patch({ resources: 0 })(start(['06026', '06026']))
  s = dispatch(clear(s), {
    type: 'TakeAction',
    investigator: 'a',
    action: { kind: 'play', card: '06026' },
  })
  expect(me(s).resources).toBe(2)
  expect(me(s).hand).toEqual(['06026', '01088'])
  expect(me(s).actionsRemaining).toBe(2)
  s = choose(s, 'choice.conditionalPlay')
  expect(me(s).resources).toBe(4)
  expect(me(s).hand).toEqual(['01088', '01088'])
  expect(me(s).actionsRemaining).toBe(2)
})
it('Short Rest heals before offering another investigator’s paid copy', () => {
  let s = patch(
    { hand: ['11096'], damage: 1, resources: 5 },
    'b',
  )(patch({ damage: 1 })(start(['11096'], ['a', 'b'])))
  s = play(s, '11096')
  s = choose(s, 'choice.conditionalHealDamage', { name: 'A' })
  expect(me(s).damage).toBe(0)
  expect(s.pending!.investigator).toBe('b')
  expect(s.investigators[1]!.resources).toBe(5)
  s = choose(s, 'choice.conditionalPlay')
  s = choose(s, 'choice.conditionalHealDamage', { name: 'B' })
  expect(s.investigators[1]!.resources).toBe(4)
  expect(s.investigators[1]!.damage).toBe(0)
})
it('Short Rest can heal an Ally, cannot heal a remote target, and can be declined', () => {
  let s = withAsset(
    patch({ damage: 1, location: 'B' }, 'b')(start(['11096'], ['a', 'b'])),
    '01018',
    { horror: 1 },
  )
  expect(b('11096').canPlay!(s, 'a')).toBe(true)
  s = play(s, '11096')
  expect(s.pending!.question.choices).toHaveLength(1)
  s = choose(s, 'choice.conditionalHealHorror')
  expect(s.assets['01018']!.horror).toBe(0)
  expect(s.investigators[1]!.damage).toBe(1)
  expect(b('11096').canPlay!(s, 'a')).toBe(false)
})
it('Spiritual Resolve discards a hand copy and heals this asset completely without exhausting it', () => {
  let s = withAsset(start(['06323']), '06323', { damage: 2, horror: 2 })
  const o = b('06323').fastOptions!(s, s.assets['06323']!)[0]!
  s = run(s, o.then)
  expect(me(s).hand).toEqual([])
  expect(me(s).discard).toContain('06323')
  expect(s.assets['06323']).toMatchObject({ damage: 0, horror: 0, exhausted: false })
  expect(b('06323').fastOptions!(s, s.assets['06323']!)).toEqual([])
})
it.each(['06245', '11090'])(
  '%s recovers mixed-level Glimmers, including the played copy with Wendy',
  (code) => {
    let s = withAsset(
      patch({ hand: [], discard: ['06245', '11090'], deck: ['11090', '01088'] })(start()),
      '01014',
    )
    s = play(s, code, 'discard')
    expect(me(s).hand.sort()).toEqual(['06245', '11090'])
    expect(me(s).deck).toEqual(['11090', '01088'])
  },
)
it('Dark Horse 5 starts as a Permanent behavior and grants its bonus only at zero resources', () => {
  let s = withAsset(begin(patch({ resources: 0 })(start())), '10127')
  expect(b('10127').permanent).toEqual({})
  expect(b('10127').mayDeclineUpkeepResources).toBe(true)
  expect(b('10127').skillModifier!(s, s.assets['10127']!, s.skillTest!)).toBe(1)
  s = patch({ resources: 1 })(s)
  expect(b('10127').skillModifier!(s, s.assets['10127']!, s.skillTest!)).toBe(0)
})
it('Newspaper 2 adds a clue to any local discovery at zero clues, with an optional reaction', () => {
  let s = withAsset(start(), '03313')
  s = dispatch(clear(s), { type: 'DiscoverClues', investigator: 'a', amount: 1 })
  expect(me(s).clues).toBe(0)
  s = choose(s, 'choice.conditionalClue')
  expect(me(s).clues).toBe(2)
  expect(s.locations.A!.clues).toBe(3)
  s = dispatch(clear(s), { type: 'DiscoverClues', investigator: 'a', amount: 1 })
  expect(me(s).clues).toBe(3)
  s = dispatch(clear(patch({ clues: 0 })(s)), {
    type: 'DiscoverClues',
    investigator: 'a',
    amount: 1,
  })
  s = choose(s, 'choice.skip')
  expect(me(s).clues).toBe(1)
})
it('two Newspapers apply once each, never exceed the clue pool, and do not improve remote discovery', () => {
  let s = withAsset(withAsset(start(), '03313'), '03313', { id: 'second' })
  s = dispatch(clear(s), { type: 'DiscoverClues', investigator: 'a', amount: 1 })
  s = choose(s, 'choice.conditionalClue')
  s = choose(s, 'choice.conditionalClue')
  expect(me(s).clues).toBe(3)
  s = patch({ clues: 0 })(s)
  s = { ...s, locations: { ...s.locations, A: { ...s.locations.A!, clues: 1 } } }
  s = dispatch(clear(s), { type: 'DiscoverClues', investigator: 'a', amount: 1 })
  expect(me(s).clues).toBe(1)
  s = { ...s, locations: { ...s.locations, B: { ...s.locations.B!, revealed: true, clues: 2 } } }
  s = dispatch(clear(patch({ clues: 0 })(s)), {
    type: 'DiscoverClues',
    investigator: 'a',
    location: 'B',
    amount: 1,
  })
  expect(me(s).clues).toBe(1)
})
it('Newspaper’s intellect bonus does not improve a willpower investigation', () => {
  let s = withAsset(begin(start()), '03313')
  const t = { ...s.skillTest!, kind: { type: 'investigate' as const, location: 'A' } }
  expect(b('03313').skillModifier!(s, s.assets['03313']!, t)).toBe(2)
  expect(b('03313').skillModifier!(s, s.assets['03313']!, { ...t, skill: 'willpower' })).toBe(0)
  s = patch({ clues: 1 })(s)
  expect(b('03313').skillModifier!(s, s.assets['03313']!, t)).toBe(0)
})
it('Serum ignores duplicate titles across levels and does not stack its hand-limit benefit', () => {
  let s = withAsset(start(['06245', '11090', '01088', '01088']), '06159')
  expect(cardsInHand(s, 'a')).toBe(2)
  s = withAsset(s, '06159', { id: 'second' })
  expect(cardsInHand(s, 'a')).toBe(2)
})
it('Serum preserves scenario weights for distinct Hidden cards', () => {
  registerScenario({ id: 'conditional-hidden-weight', hiddenHandWeight: () => 3 })
  const hidden = (id: string): Treachery => ({
    id,
    code: id,
    kind: 'treachery',
    name: 'Same hidden card',
    keywords: ['hidden'],
    hidden: true,
    placement: { type: 'threatArea', investigator: 'a' },
  })
  let s: GameState = {
    ...start(['01088']),
    scenarioId: 'conditional-hidden-weight',
    treacheries: { h1: hidden('h1'), h2: hidden('h2') },
  }
  expect(cardsInHand(s, 'a')).toBe(7)
  s = withAsset(s, '06159')
  expect(cardsInHand(s, 'a')).toBe(4)
})
it('Serum reveals both copies and draws once; adding a card without drawing does not trigger it', () => {
  let s = withAsset(start(['01088']), '06159')
  s = dispatch(clear(s), { type: 'DrawCards', investigator: 'a', amount: 1 })
  s = choose(s, 'choice.conditionalReveal')
  expect(me(s).hand).toHaveLength(3)
  expect(s.assets['06159']!.exhausted).toBe(true)
  expect(cardsInHand(s, 'a')).toBe(1)
  s = withAsset(start(['01088']), '06159')
  s = dispatch(clear(s), { type: 'TakeFromDeck', investigator: 'a', code: '01088', to: 'hand' })
  expect(me(s).hand).toHaveLength(2)
  expect(s.assets['06159']!.exhausted).toBe(false)
})
it.each([0, -1, 'skull'] as const)(
  'Recall names %s before committing and grants its bonus only once',
  (token) => {
    let s = begin(withAsset({ ...start(), chaosBag: [token] }, '04158'))
    s = choose(s, 'choice.conditionalRecall')
    s =
      typeof token === 'number'
        ? choose(s, 'choice.conditionalToken', { token: String(token) })
        : choose(s, 'chaosTokenName.skull')
    expect(s.skillTest!.tokenPredictions!['04158']).toBe(token)
    s = dispatch(clear(s), { type: 'RevealChaosToken' })
    expect(s.assets['04158']!.exhausted).toBe(true)
    expect(s.skillTest!.baseModifier).toBe(2)
    s = { ...s, assets: { ...s.assets, '04158': { ...s.assets['04158']!, exhausted: false } } }
    expect(
      b('04158').forced!(
        s,
        { type: 'afterRevealChaosToken', investigator: 'a', token },
        s.assets['04158']!,
      ),
    ).toEqual([])
  },
)
it('Recall ignores canceled or ignored tokens and cannot grant a bonus after leaving play', () => {
  let s = withAsset(begin(start()), '04158')
  s = dispatch(clear(s), { type: 'NameSkillTestToken', asset: '04158', token: -1 })
  s = { ...s, chaosBag: [], skillTest: { ...s.skillTest!, revealing: { token: -1, face: -1 } } }
  s = dispatch(clear(s), { type: 'CancelRevealedToken', redraw: false })
  expect(s.assets['04158']!.exhausted).toBe(false)
  s = dispatch({ ...clear(s), chaosBag: [] }, { type: 'RevealChaosToken', token: 0, ignored: -1 })
  expect(s.assets['04158']!.exhausted).toBe(false)
  expect(s.skillTest!.baseModifier).toBe(0)
  s = dispatch(clear(s), { type: 'DiscardAsset', asset: '04158' })
  s = dispatch(clear(s), { type: 'RevealChaosToken', token: -1 })
  expect(s.skillTest!.baseModifier).toBe(0)
})
