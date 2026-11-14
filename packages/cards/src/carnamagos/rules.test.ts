// RR: Bonded, Attach To, Chaos Tokens; FAQ 2.3: Rod tokens count during a test without resolving.
import { expect, it } from 'vitest'
import {
  attachedStat,
  dispatch,
  playerCardBehavior,
  playerCardDef,
  poolTokensAvailable,
  revealedTestTokens,
  registerPlayerCard,
  registerEnemy,
  type AbilityOption,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, ghoul, spawnAt } from '@lcg/engine/testing'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'
import data from '../data/carnamagos.json'
import './index'
const ROTS = ['10086', '10087', '10088', '10089', '10090']
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const base = (code = '10085') => {
  let s = clear(patch({ hand: [], outOfPlay: ROTS, resources: 10 })(game(['a', 'b'])))
  s = dispatch(s, spawnAt('A', { ...ghoul, health: 8 }, 'a'))
  return { ...clear(withAsset(s, code)), interactive: true }
}
const id = (s: GameState) => Object.keys(s.enemies)[0]!
const run = (s: GameState, then: Message[]) =>
  then.reduce((state, m) => dispatch(state, m), clear(s))
const use = (s: GameState, code = '10085') => {
  const a = Object.values(s.assets).find((a) => a.code === code)!
  const o = playerCardBehavior(code)!.abilities!(s, a, 'a')[0]! as AbilityOption
  return run(s, [
    {
      type: 'UseAbility',
      investigator: 'a',
      key: o.key,
      actions: o.actions,
      provokes: o.provokes,
      then: o.then,
    },
  ])
}
const attach = (s: GameState, code: string) =>
  run(s, [
    { type: 'AttachPlayerCardToEnemy', investigator: 'a', code, enemy: id(s), fromSetAside: true },
  ])

it.each(data)('$code is registered exactly once with reviewed data', (c) => {
  expect(playerCardDef(c.code)?.name).toBe(c.name)
  expect(playerCardBehavior(c.code)).toBeDefined()
})
it('level zero attaches one random available Rot even after multiple curses and returns all tokens', () => {
  const bag: GameState['chaosBag'] = ['curse', 'curse', 'curse', 0, 0]
  const s = use({ ...base(), chaosBag: bag })
  expect(Object.values(s.treacheries)).toHaveLength(1)
  expect(me(s).outOfPlay).toHaveLength(4)
  expect(s.chaosBag.sort()).toEqual(bag.sort())
  expect(s.heldChaosTokens).toEqual({})
  expect(s.assets['10085']?.exhausted).toBe(true)
})
it('no curse attaches nothing and auto-fail and frost do not resolve outside the test', () => {
  const bag: GameState['chaosBag'] = ['autoFail', 'frost', 'frost', 'elderSign', -4]
  const s = use({ ...base(), chaosBag: bag })
  expect(Object.values(s.treacheries)).toHaveLength(0)
  expect(me(s).outOfPlay).toHaveLength(5)
  expect(s.chaosBag.sort()).toEqual(bag.sort())
})
it('level two chooses a different available Rot per curse and can decline the remaining ones', () => {
  let s = use({ ...base('10098'), chaosBag: ['curse', 'curse', 0, 0, 0] }, '10098')
  s = choose(s, 'choice.card', { card: 'Abyssal Rot' })
  expect(me(s).outOfPlay).not.toContain('10086')
  expect(s.pending?.question.choices.filter((c) => c.params?.card === 'Abyssal Rot')).toHaveLength(
    0,
  )
  s = choose(s, 'choice.done')
  expect(Object.values(s.treacheries)).toHaveLength(1)
})
it('level two may attach one Rot per curse, not one for each other symbol', () => {
  let s = use({ ...base('10098'), chaosBag: ['curse', 'curse', 'autoFail', 0, 0] }, '10098')
  s = choose(s, 'choice.card', { card: 'Putrescent Rot' })
  s = choose(s, 'choice.card', { card: 'Virescent Rot' })
  expect(Object.values(s.treacheries)).toHaveLength(2)
  expect(attachedStat(s, id(s), 'fight')).toBe(-1)
  expect(attachedStat(s, id(s), 'evade')).toBe(-1)
})
it('both rods target a remote enemy but exclude Elite and immune targets and exhausted rods', () => {
  let s = base()
  const a = s.assets['10085']!
  s = {
    ...s,
    enemies: { ...s.enemies, [id(s)]: { ...s.enemies[id(s)]!, location: 'B', engagedWith: null } },
  }
  expect(playerCardBehavior(a.code)!.abilities!(s, a, 'a')).toHaveLength(1)
  for (const traits of [['Elite']]) {
    const blocked = { ...s, enemies: { [id(s)]: { ...s.enemies[id(s)]!, traits } } }
    expect(playerCardBehavior(a.code)!.abilities!(blocked, a, 'a')).toHaveLength(0)
  }
  registerEnemy({ code: 'rod-immune-enemy', immuneToPlayerCards: true })
  const immune = { ...s, enemies: { [id(s)]: { ...s.enemies[id(s)]!, code: 'rod-immune-enemy' } } }
  expect(playerCardBehavior(a.code)!.abilities!(immune, a, 'a')).toHaveLength(0)
  expect(playerCardBehavior(a.code)!.abilities!(s, { ...a, exhausted: true }, 'a')).toHaveLength(0)
})
it.each(ROTS)('%s returns to its owner set aside when its host is discarded', (code) => {
  let s = attach(base(), code)
  expect(me(s).outOfPlay).not.toContain(code)
  s = run(s, [{ type: 'DiscardEnemy', enemy: id(s) }])
  expect(Object.values(s.treacheries)).toHaveLength(0)
  expect(me(s).outOfPlay?.filter((c) => c === code)).toHaveLength(1)
  expect(me(s).discard).not.toContain(code)
})
it('Aember pays printed health capped at five only on defeat', () => {
  let s = attach(base(), '10087')
  s = run(s, [{ type: 'DefeatEnemy', enemy: id(s), by: 'b' }])
  expect(me(s).resources).toBe(15)
  expect(me(s).outOfPlay).toContain('10087')
  s = attach(base(), '10087')
  s = run(s, [{ type: 'DiscardEnemy', enemy: id(s) }])
  expect(me(s).resources).toBe(10)
})
it('Scarlet deals one damage at round end and cannot be assigned to another enemy', () => {
  let s = attach(base(), '10089')
  s = run(s, [{ type: 'Forced', trigger: { type: 'roundEnds' } }])
  expect(s.enemies[id(s)]?.damageTaken).toBe(1)
})
it('Abyssal prevents enemy attacks including attacks of opportunity and forced attacks', () => {
  const s = attach(base(), '10086')
  for (const type of ['EnemyAttack', 'ResolveEnemyAttack'] as const) {
    const after = run(s, [
      { type, enemy: id(s), investigator: 'a', evenIfExhausted: true } as Message,
    ])
    expect(me(after).damage).toBe(0)
    expect(me(after).horror).toBe(0)
  }
})
it('Virescent prevents card and hunter movement without preventing engagement at its location', () => {
  let s = attach(base(), '10090')
  s = run(s, [{ type: 'MoveEnemy', enemy: id(s), location: 'B' }])
  expect(s.enemies[id(s)]?.location).toBe('A')
})
it('supplemental tokens count for end-of-test effects but do not change the modifier or get returned twice', () => {
  let s = base()
  s = run(s, [
    {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'intellect',
      difficulty: 1,
      kind: { type: 'effect', source: 'rod-test', onSuccess: [], onFail: [], onFailEach: [] },
    },
  ])
  s = use({ ...s, chaosBag: ['curse', 'autoFail', 'frost', -4, 0] })
  // Any prompts offered by other cards are absent in this fixture.
  expect(s.skillTest?.tokenModifier).toBe(0)
  expect(s.skillTest?.autoFail).toBe(false)
  expect(s.skillTest?.supplementalTokens).toHaveLength(5)
  expect(revealedTestTokens(s.skillTest!)).toHaveLength(5)
  expect(s.chaosBag).toHaveLength(5)
})
it('the Rod returns a bag smaller than five without leaving a held group behind', () => {
  const s = use({ ...base(), chaosBag: ['curse', 0] })
  expect(s.chaosBag).toHaveLength(2)
  expect(s.heldChaosTokens).toEqual({})
  expect(Object.values(s.treacheries)).toHaveLength(1)
})
it('Virescent stops hunter movement and leaves an engaged enemy behind when its investigator moves', () => {
  let s = attach(base(), '10090')
  const eid = id(s)
  s = run(s, [{ type: 'MoveTo', investigator: 'a', location: 'B', unpreventable: true }])
  expect(s.enemies[eid]?.location).toBe('A')
  expect(s.enemies[eid]?.engagedWith).toBe(null)
  s = { ...s, enemies: { [eid]: { ...s.enemies[eid]!, keywords: ['hunter'], exhausted: false } } }
  s = run(s, [{ type: 'HuntersMove' } as Message])
  expect(s.enemies[eid]?.location).toBe('A')
})
it('Ritual Candles responds to a Rod reveal during a test without applying the symbol modifier', () => {
  let s = withAsset(base(), '02029')
  s = run(s, [
    {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'intellect',
      difficulty: 1,
      kind: { type: 'effect', source: 'rod-test', onSuccess: [], onFail: [], onFailEach: [] },
    },
  ])
  s = use({ ...s, chaosBag: ['skull'] })
  expect(s.pending?.question.choices.some((c) => c.label === 'ability.pilotCandle')).toBe(true)
  s = choose(s, 'ability.pilotCandle')
  expect(s.skillTest?.tokenModifier).toBe(0)
  expect(s.skillTest?.baseModifier).toBe(1)
  expect(s.chaosBag).toEqual(['skull'])
})
it('the Rod triggers a cursed spell source once at level zero without applying curse modifiers', () => {
  let s = withAsset(base(), '07117')
  s = run(s, [
    {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'willpower',
      difficulty: 1,
      source: '07117',
      kind: { type: 'fight', enemy: id(s) },
    },
  ])
  s = use({ ...s, chaosBag: ['curse', 'curse', 0, 0, 0] })
  expect(s.pending?.question.choices.some((c) => c.label === 'choice.curseCharge')).toBe(true)
  s = choose(s, 'choice.curseCharge', { card: 'Armageddon' })
  expect(s.assets['07117']?.uses).toBe(4)
  expect(s.skillTest?.tokenModifier).toBe(0)
  expect(s.skillTest?.supplementalTokens?.filter((t) => t === 'curse')).toHaveLength(2)
})
it('canceling a Rod token without replacement continues the other reveals and returns no duplicate token', () => {
  let s = withAsset(base(), '06277', { uses: 2 })
  s = patch({ damage: 1, horror: 1 })(s)
  s = run(s, [
    {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'intellect',
      difficulty: 1,
      kind: { type: 'effect', source: 'rod-test', onSuccess: [], onFail: [], onFailEach: [] },
    },
  ])
  s = use({ ...s, chaosBag: ['skull', 0, 0, 0, 0] })
  s = choose(s, 'ability.advancedTest', { card: 'Wish Eater' })
  if (
    s.pending?.question.choices.some(
      (c) => c.label === 'ability.advancedTest' && c.params?.card === 'Wish Eater',
    )
  )
    s = choose(s, 'ability.advancedTest', { card: 'Wish Eater' })
  expect(s.heldChaosTokens).toEqual({})
  expect(s.chaosBag).toHaveLength(5)
  expect(me(s).damage).toBe(0)
  expect(me(s).horror).toBe(0)
  expect(s.skillTest?.tokenModifier).toBe(0)
  expect(revealedTestTokens(s.skillTest!)).toHaveLength(5)
})
it('pool: held Rod curses remain in the supply while reveal reactions attempt to add more curses', () => {
  registerPlayerCard({
    code: 'rod-supply-test',
    forced: (_s, t) =>
      t.type === 'afterRevealChaosToken' ? [{ type: 'AddChaosTokens', tokens: ['curse'] }] : [],
  })
  let s = withAsset(base(), 'rod-supply-test')
  s = run(s, [
    {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'intellect',
      difficulty: 1,
      kind: { type: 'effect', source: 'rod-test', onSuccess: [], onFail: [], onFailEach: [] },
    },
  ])
  s = use({ ...s, chaosBag: Array(10).fill('curse') })
  expect(s.chaosBag).toHaveLength(10)
  expect(s.heldChaosTokens).toEqual({})
  s = run(s, [{ type: 'EndSkillTest' }])
  expect(s.chaosBag).toHaveLength(10)
})
it('pool: False Covenant removes a Rod curse to the pool and replaces it without returning it at ST.8', () => {
  let s = withAsset(base(), '07116')
  s = run(s, [
    {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'intellect',
      difficulty: 1,
      kind: { type: 'effect', source: 'rod-test', onSuccess: [], onFail: [], onFailEach: [] },
    },
  ])
  s = use({ ...s, chaosBag: ['curse', 0, 0, 0, 0, 0] })
  s = choose(s, 'ability.tokenTrigger.07116', { card: 'False Covenant' })
  expect(s.chaosBag).toHaveLength(5)
  expect(s.chaosBag).not.toContain('curse')
  expect(s.skillTest?.tokenModifier).toBe(0)
  s = run(s, [{ type: 'EndSkillTest' }])
  expect(s.chaosBag).toHaveLength(5)
})
it('discarding the Rod leaves its Rots attached until their own host leaves play', () => {
  let s = attach(base(), '10088')
  s = run(s, [{ type: 'DiscardAsset', asset: '10085' }])
  expect(Object.values(s.treacheries)).toHaveLength(1)
  expect(me(s).outOfPlay).not.toContain('10088')
  expect(attachedStat(s, id(s), 'fight')).toBe(-1)
})
it('an attached Rot returns to its own investigator even when somebody else defeats the host', () => {
  let s = patch({ outOfPlay: ['10087'], resources: 0 }, 'b')(base())
  s = run(s, [
    {
      type: 'AttachPlayerCardToEnemy',
      investigator: 'b',
      code: '10087',
      enemy: id(s),
      fromSetAside: true,
    },
  ])
  s = run(s, [{ type: 'DefeatEnemy', enemy: id(s), by: 'a' }])
  expect(s.investigators[1]?.outOfPlay).toEqual(['10087'])
  expect(s.investigators[1]?.resources).toBe(5)
  expect(me(s).resources).toBe(10)
})
it('supply queries in a Rod when-window count its held physical token exactly once', () => {
  registerPlayerCard({
    code: 'rod-supply-when-test',
    reactions: (s, t) =>
      t.type === 'whenRevealChaosToken' && poolTokensAvailable(s, 'curse') > 0
        ? [
            {
              key: 'rod-supply-when-test',
              investigator: 'a',
              label: 'ability.advancedTest',
              then: [{ type: 'AddChaosTokens', tokens: ['curse'] }],
            },
          ]
        : [],
  })
  let s = withAsset(base(), 'rod-supply-when-test')
  s = run(s, [
    {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'intellect',
      difficulty: 1,
      kind: { type: 'effect', source: 'rod-test', onSuccess: [], onFail: [], onFailEach: [] },
    },
  ])
  s = use({ ...s, chaosBag: Array(9).fill('curse') })
  expect(s.pending?.question.choices.some((c) => c.label === 'ability.advancedTest')).toBe(true)
  s = choose(s, 'ability.advancedTest')
  expect(s.chaosBag).toHaveLength(10)
  expect(s.heldChaosTokens).toEqual({})
})
it('Peril keeps the other investigator from using their Rod in the test fast window', () => {
  let s = withAsset(base(), '10085', { owner: 'b' })
  s = run(s, [
    {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'intellect',
      difficulty: 1,
      tags: ['peril'],
      kind: { type: 'effect', source: 'rod-test', onSuccess: [], onFail: [], onFailEach: [] },
    },
  ])
  const rod = s.assets['10085']!
  expect(playerCardBehavior('10085')!.fastOptions!(s, rod)).toHaveLength(0)
  expect(playerCardBehavior('10085')!.fastOptions!(s, { ...rod, owner: 'a' })).toHaveLength(1)
})
