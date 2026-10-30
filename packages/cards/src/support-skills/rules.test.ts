// RR: Assigning Damage/Horror, Direct Damage, Triggered Abilities, Skill Tests, Search.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  playerCardDef,
  registerPlayerCard,
  type GameState,
} from '@lcg/engine'
import { game, withAsset, patch, me } from '../dunwich-pilot/testing'
import data from '../data/support-skills.json'
import '../index'
const clear = (s: ReturnType<typeof game>) => ({ ...s, pending: null, queue: [] })
const open = (source?: string) => {
  const s = dispatch(patch({ hand: ['01093'] })(clear(game())), {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'willpower',
    difficulty: 3,
    kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
    ...(source ? { effectSource: source } : {}),
  })
  return clear(s)
}
const comps = data.filter((c) => c.traits.includes('Composure'))
it.each(comps)(
  '$code boosts its printed skills, charges once per activation, and excludes other tests',
  (card) => {
    let s = withAsset(open(), card.code)
    s = patch({ resources: 3 })(s)
    const b = playerCardBehavior(card.code)!
    const a = s.assets[card.code]!
    const skills = ['willpower', 'intellect', 'combat', 'agility'] as const
    const expected: Record<string, string[]> = {
      '03107': ['combat', 'agility'],
      '08027': ['combat', 'agility'],
      '03109': ['intellect', 'combat'],
      '08040': ['intellect', 'combat'],
      '03111': ['willpower', 'agility'],
      '08056': ['willpower', 'agility'],
      '03115': ['willpower', 'intellect'],
      '08081': ['willpower', 'intellect'],
    }
    for (const skill of skills) {
      const t = { ...s.skillTest!, skill }
      const allowed = !!expected[card.code]?.includes(skill)
      const options = b.testOptions!(s, t, a)
      expect(options.length).toBe(allowed ? 1 : 0)
      expect(b.skillModifier!(s, a, t)).toBe(allowed && card.xp === 3 ? 1 : 0)
      expect(b.testOptions!(s, { ...t, investigator: 'b' }, a)).toEqual([])
      if (options.length) {
        let next: GameState = { ...s, skillTest: t }
        for (const m of options[0]!.then) next = dispatch(next, m)
        expect(me(next).resources).toBe(2)
        expect(next.skillTest!.baseModifier).toBe(1)
      }
    }
    const empty = patch({ resources: 0 })(s)
    expect(b.testOptions!(empty, s.skillTest!, a)).toEqual([])
    expect(b.limitTrait).toBe('Composure')
    expect(b.canPlay!(s, 'a')).toBe(false)
    expect(b.canPlay!({ ...s, assets: {} }, 'a')).toBe(true)
  },
)
it.each(comps)('$code distinguishes damage priority in level 1 and level 3 Composure', (card) => {
  let s = withAsset(withAsset(clear(game()), card.code), '01033', { id: 'ally' })
  s = dispatch(s, { type: 'TakeDamage', investigator: 'a', damage: 1, horror: 0 })
  expect(s.pending!.question.choices.some((c) => c.label === 'choice.assignToInvestigator')).toBe(
    card.xp === 1,
  )
})
it.each(comps)(
  '$code assigns to Composure before the investigator while permitting another ally',
  (card) => {
    let s = withAsset(withAsset(clear(game()), card.code), '01033', { id: 'ally' })
    s = dispatch(s, { type: 'TakeDamage', investigator: 'a', damage: 0, horror: 1 })
    const choices = s.pending?.question.choices ?? []
    expect(choices.some((c) => c.label === 'choice.assignToInvestigator')).toBe(false)
    expect(choices.some((c) => c.target?.type === 'asset' && c.target.id === 'ally')).toBe(true)
    s = dispatch(clear(s), {
      type: 'TakeDamage',
      investigator: 'a',
      damage: 0,
      horror: 1,
      direct: true,
    })
    expect(me(s).horror).toBe(1)
    expect(s.assets[card.code]!.horror).toBe(0)
  },
)
it.each(['03113', '08069', '03035'])(
  '%s requires a test on a Spell and exhausts Athame only',
  (code) => {
    let s = withAsset(open('01066'), code)
    const b = playerCardBehavior(code)!
    const a = s.assets[code]!
    const option = b.testOptions!(s, s.skillTest!, a)[0]!
    expect(option).toBeDefined()
    for (const m of option.then) s = dispatch(s, m)
    expect(s.skillTest!.baseModifier).toBe(code === '03035' ? 2 : 1)
    expect(s.assets[code]!.exhausted).toBe(code === '03035')
    expect(
      b.testOptions!(
        { ...s, skillTest: { ...s.skillTest!, effectSource: '01088' } },
        { ...s.skillTest!, effectSource: '01088' },
        a,
      ),
    ).toEqual([])
  },
)
it.each(['01063', '03271'])(
  '%s resolves its entrance and searches for spells across card types',
  (code) => {
    const s = withAsset(game(), code)
    const a = s.assets[code]!
    const b = playerCardBehavior(code)!
    const messages = b.forced!(
      s,
      { type: 'afterAssetEntersPlay', investigator: 'a', asset: code },
      a,
    )
    expect(messages[0]).toMatchObject(
      code === '01063'
        ? { type: 'PlaceDoomOnAsset', amount: 1 }
        : { type: 'Ask', question: { alwaysAsk: true } },
    )
    expect(b.abilities!(s, a, 'a')[0]!.then[0]).toMatchObject({
      type: 'SearchDeck',
      top: 3,
      traits: ['Spell'],
      anyType: true,
      drawFound: true,
    })
    expect(b.abilities!(s, { ...a, exhausted: true }, 'a')).toEqual([])
  },
)
it('Fine Clothes reduces actual parley difficulty, including the floor at zero', () => {
  for (const tags of [[], ['parley']]) {
    let s = withAsset(patch({ hand: ['01093'] })(clear(game())), '02272')
    s = dispatch(s, {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'intellect',
      difficulty: 1,
      tags,
      kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
    })
    expect(s.skillTest!.difficulty).toBe(tags.length ? 0 : 1)
  }
})
it('Forbidden Knowledge exhausts, takes horror, spends its last secret and discards', () => {
  let s = withAsset(clear(game()), '01058', { uses: 1 })
  const b = playerCardBehavior('01058')!
  const option = b.abilities!(s, s.assets['01058']!, 'a')[0]!
  for (const m of [...option.costs!, ...option.then]) s = dispatch(clear(s), m)
  expect(me(s).horror).toBe(1)
  expect(me(s).resources).toBe(6)
  expect(s.assets['01058']).toBeUndefined()
})
it('moving a secret does not trigger resource-gain reactions', () => {
  registerPlayerCard({
    code: 'support-observer',
    forced: (_s, t, a) =>
      t.type === 'afterGainResources'
        ? [{ type: 'TakeDamage', investigator: a.owner, damage: 0, horror: 1 }]
        : [],
  })
  let s = withAsset(withAsset(clear(game()), '01058', { uses: 2 }), 'support-observer')
  const before = me(s).resources
  s = dispatch(s, { type: 'MoveUsesToResources', asset: '01058', investigator: 'a', amount: 1 })
  expect(me(s).resources).toBe(before + 1)
  expect(me(s).horror).toBe(0)
  expect(s.assets['01058']!.uses).toBe(1)
  s = dispatch(clear(s), { type: 'GainResources', investigator: 'a', amount: 1 })
  expect(me(s).horror).toBe(1)
})
it('Joey pays an extra resource to play only affordable Item assets', () => {
  let s = withAsset(patch({ hand: ['01030', '01088'], resources: 2 })(game()), '02265')
  const b = playerCardBehavior('02265')!
  const options = b.abilities!(s, s.assets['02265']!, 'a')
  expect(options).toHaveLength(1)
  for (const m of [...options[0]!.costs!, ...options[0]!.then]) s = dispatch(clear(s), m)
  expect(Object.values(s.assets).some((a) => a.code === '01030')).toBe(true)
  expect(me(s).resources).toBe(0)
  expect(b.abilities!(s, s.assets['02265']!, 'a')).toEqual([])
})
it.each(['03032', '52007'])(
  '%s exhausts and pays a charge, with capped resources and symbol backlash',
  (code) => {
    const s = withAsset(open(), code, { uses: 4 })
    const a = s.assets[code]!
    const b = playerCardBehavior(code)!
    const option = b.abilities!(s, a, 'a')[0]!
    expect(option.costs).toEqual([
      { type: 'ExhaustAsset', asset: code },
      { type: 'SpendUses', asset: code, amount: 1 },
    ])
    const begin = option.then[0]!
    expect(begin).toMatchObject({
      type: 'BeginSkillTest',
      skill: 'willpower',
      source: code,
      difficulty: code === '03032' ? 1 : 0,
    })
    if (begin.type !== 'BeginSkillTest' || begin.kind.type !== 'effect')
      throw new Error('Expected alchemy test')
    expect(begin.kind.onSuccess).toHaveLength(code === '03032' ? 3 : 4)
    for (const token of ['skull', 'cultist', 'tablet', 'elderThing', 'autoFail'] as const)
      expect(b.onTokenRevealed!(s, token, a)).toEqual([
        { type: 'TakeDamage', investigator: 'a', damage: 1, horror: 0 },
      ])
    expect(b.onTokenRevealed!(s, 'elderSign', a)).toEqual([])
    expect(b.onTokenRevealed!(s, -2, a)).toEqual([])
    expect(b.abilities!(s, { ...a, uses: 0 }, 'a')).toEqual([])
  },
)
it('Ace in the Hole is exceptional and grants three actions during its own turn', () => {
  let s: GameState = { ...clear(game()), activeTurn: 'a' }
  const b = playerCardBehavior('02266')!
  expect(playerCardDef('02266')).toMatchObject({ cost: 0, xp: 3, exceptional: true, deckLimit: 1 })
  expect(b.canPlay!(s, 'a')).toBe(true)
  expect(b.canPlay!({ ...s, activeTurn: 'b' }, 'a')).toBe(false)
  const before = me(s).actionsRemaining
  for (const m of b.play!(s, 'a')) s = dispatch(s, m)
  expect(me(s).actionsRemaining).toBe(before + 3)
})
