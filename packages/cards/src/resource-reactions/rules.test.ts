// RR: Uses, Replenish, Skill Tests, Copy, Research, Costs, Defeat, Timing.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  playerCardDef,
  previewToken,
  registerPlayerCard,
  type GameState,
  type Message,
  type AbilityOption,
  type SkillType,
} from '@lcg/engine'
import { choose, ghoul } from '@lcg/engine/testing'
import { game, patch, me, withAsset } from '../dunwich-pilot/testing'
import './index'
it.each(['12059', '12062', '12071', '60481', '60459', '60460'])(
  'Twila cannot replace a charge removed by %s token effects',
  (code) => {
    let s = withAsset(withAsset(start(), code), '06244')
    const before = s.assets[code]!.uses
    const b = playerCardBehavior(code)!,
      token = playerCardDef(code)!.name === 'Cosmic Flame' ? 'skull' : 'cultist'
    s = run(s, b.onTokenRevealed!(s, token, s.assets[code]!))
    expect(s.assets[code]!.uses).toBe(before - 1)
    expect(s.assets['06244']!.exhausted).toBe(false)
    expect(s.pending).toBeNull()
  },
)
it.each([
  [0, 0, false],
  [0, -3, false],
  [2, -1, false],
  [2, -2, true],
  [2, -4, true],
] as const)(
  'Eucatastrophe requires a reduction from %i by %i to zero',
  (value, token, eligible) => {
    let s = test(
      patch({ skills: { intellect: value, willpower: value, agility: value, combat: value } })(
        start(),
      ),
    )
    s = { ...s, skillTest: { ...s.skillTest!, revealing: { token, face: token } } }
    expect(
      playerCardBehavior('05324')!.handReactions!(
        s,
        { type: 'afterRevealingChaosToken', investigator: 'a', token },
        'a',
      ).length > 0,
    ).toBe(eligible)
  },
)
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const start = (players = ['a']) =>
  patch({
    hand: [],
    resources: 20,
    skills: { willpower: 10, intellect: 10, combat: 10, agility: 10 },
  })(clear(game(players)))
const run = (s: GameState, ms: Message[]) => ms.reduce((s, m) => dispatch(s, m), clear(s))
const options = (s: GameState, code: string) =>
  playerCardBehavior(code)!.abilities!(s, s.assets[code]!, 'a')
const activate = (s: GameState, o: AbilityOption) =>
  dispatch(clear(s), {
    type: 'UseAbility',
    investigator: 'a',
    key: o.key,
    actions: o.actions,
    provokes: o.provokes,
    ...(o.costs ? { costs: o.costs } : {}),
    ...(o.limit ? { limit: o.limit } : {}),
    then: o.then,
  })
const fast = (s: GameState, code: string, n = 0) =>
  run(s, playerCardBehavior(code)!.fastOptions!(s, s.assets[code]!)[n]!.then)
const test = (s: GameState, skill: SkillType = 'intellect', source?: string) =>
  dispatch(patch({ hand: ['01093'] })(clear(s)), {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill,
    difficulty: 3,
    ...(source ? { source } : {}),
    kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
  })
const foe = (s: GameState): GameState => ({
  ...s,
  enemies: {
    foe: {
      ...ghoul,
      id: 'foe',
      location: 'A',
      engagedWith: 'a',
      health: 20,
      maxHealth: 20,
      damageTaken: 0,
      exhausted: false,
      doom: 0,
      traits: ['Humanoid'],
    },
  },
})
const location = (
  s: GameState,
  id = 'B',
  changes: Partial<GameState['locations'][string]> = {},
): GameState => ({
  ...s,
  locations: {
    ...s.locations,
    [id]: {
      ...s.locations.A!,
      id,
      name: id,
      connections: ['A'],
      revealed: true,
      clues: 4,
      ...changes,
    },
  },
})
it('Fieldwork reserves a phase-limited bonus and consumes it on the next test', () => {
  let s = withAsset(location(start()), '03024')
  s = patch({ location: 'B' })(s)
  const b = playerCardBehavior('03024')!,
    r = b.reactions!(
      s,
      { type: 'afterMove', investigator: 'a', first: true, from: 'A' },
      s.assets['03024']!,
    )[0]!
  s = run(s, r.then)
  expect(s.assets['03024']!.exhausted).toBe(true)
  const otherPhase = test({ ...s, phase: 'enemy' })
  expect(otherPhase.skillTest!.baseModifier).toBe(0)
  s = test(s)
  expect(s.skillTest!.baseModifier).toBe(2)
  expect(me(s).nextPhaseTestBonus).toBeUndefined()
})
it('Investments accumulates up to ten and pays its discard cost before moving resources', () => {
  let s = withAsset(start(), '05233', { uses: 9 })
  s = fast(s, '05233')
  expect(s.assets['05233']).toMatchObject({ uses: 10, exhausted: true })
  s = withAsset(s, '05233', { uses: 10 })
  expect(playerCardBehavior('05233')!.fastOptions!(s, s.assets['05233']!)).toEqual([])
  const o = options(s, '05233')[0]!
  expect(o.costs).toContainEqual({ type: 'DiscardAsset', asset: '05233' })
  s = activate(s, o)
  expect(s.assets['05233']).toBeUndefined()
  expect(me(s).resources).toBe(30)
  expect(me(s).discard).toContain('05233')
})
it('Twila replaces only one charge after spending multiple charges, but not after moving them', () => {
  let s = withAsset(withAsset(start(), '01060'), '06244')
  s = dispatch(s, { type: 'SpendUses', asset: '01060', amount: 2 })
  s = choose(s, 'choice.resourceReact', { card: playerCardDef('06244')!.name })
  expect(s.assets['01060']!.uses).toBe(3)
  expect(s.assets['06244']!.exhausted).toBe(true)
  s = withAsset(withAsset(withAsset(start(), '01060'), '06244'), '01060', { id: 'second', uses: 0 })
  s = dispatch(s, { type: 'TransferUses', from: '01060', to: 'second', amount: 1 })
  expect(s.assets['01060']!.uses).toBe(3)
  expect(s.assets.second!.uses).toBe(1)
  expect(s.assets['06244']!.exhausted).toBe(false)
})
it('Sophist moves matching secrets to another investigator and cannot mix token types', () => {
  let s = withAsset(
    withAsset(withAsset(start(['a', 'b']), '07111'), '03025', { owner: 'b', uses: 1 }),
    '01060',
  )
  const opts = playerCardBehavior('07111')!.fastOptions!(s, s.assets['07111']!)
  expect(opts.some((o) => o.then.some((m) => m.type === 'TransferUses' && m.to === '01060'))).toBe(
    false,
  )
  s = run(
    s,
    opts.find((o) => o.then.some((m) => m.type === 'TransferUses' && m.to === '03025'))!.then,
  )
  expect(s.assets['07111']).toMatchObject({ uses: 2, exhausted: true })
  expect(s.assets['03025']!.uses).toBe(2)
})
it.each([1, 2, 3])('Gregory wagers %i resources and rewards only a sufficient margin', (n) => {
  let s = withAsset(start(), '06162')
  s = test(s)
  const b = playerCardBehavior('06162')!,
    r = b.reactions!(
      s,
      { type: 'afterSkillTestInitiated', investigator: 'a' },
      s.assets['06162']!,
    )[0]!
  s = run(s, r.then)
  s = choose(s, 'choice.resourceBet', { n })
  expect(s.assets['06162']!.uses).toBe(9 - n)
  const t = s.skillTest!
  expect(
    b.reactions!(s, { type: 'afterSkillTestInitiated', investigator: 'a' }, s.assets['06162']!),
  ).toEqual([])
  const win = run(
    { ...s, skillTest: { ...t, succeeded: true, modifiedSkill: t.difficulty + n } },
    t.tokenOnSuccess ?? [],
  )
  expect(me(win).resources).toBe(20 + n)
  if (n > 0) {
    const loss = run(
      { ...s, skillTest: { ...t, succeeded: true, modifiedSkill: t.difficulty + n - 1 } },
      t.tokenOnSuccess ?? [],
    )
    expect(me(loss).resources).toBe(20)
  }
})
it('Disc discards a non-Elite spawn but never an Elite, paying its own discard cost', () => {
  let s = withAsset(foe(start()), '01041')
  const b = playerCardBehavior('01041')!,
    a = s.assets['01041']!,
    t = { type: 'enemySpawned' as const, enemy: 'foe', location: 'A' }
  expect(
    b.reactions!({ ...s, enemies: { foe: { ...s.enemies.foe!, traits: ['Elite'] } } }, t, a),
  ).toEqual([])
  s = run(s, b.reactions!(s, t, a)[0]!.then)
  expect(s.enemies.foe).toBeUndefined()
  expect(s.assets['01041']).toBeUndefined()
})
it('Guiding Spirit grants intellect, requires horror assignment first and is exiled on horror defeat', () => {
  let s = withAsset(start(), '05236')
  const b = playerCardBehavior('05236')!
  expect(b.beforeOwnerAssignment).toEqual(['horror'])
  expect(b.skillModifier!(s, s.assets['05236']!, { skill: 'intellect' } as never)).toBe(1)
  s = dispatch(s, {
    type: 'DamageAsset',
    asset: '05236',
    damage: 0,
    horror: playerCardDef('05236')!.sanity!,
  })
  expect(s.assets['05236']).toBeUndefined()
  expect(me(s).discard).not.toContain('05236')
  expect(s.exiled).toContainEqual({ investigator: 'a', code: '05236' })
})
it.each(['10043', '10067', '10111'])(
  '%s boosts only its skills, once per test, spending an offering',
  (code) => {
    const skill: SkillType = code === '10067' ? 'intellect' : 'willpower'
    let s = test(withAsset(start(), code), skill)
    const b = playerCardBehavior(code)!,
      a = s.assets[code]!
    const o = b.testOptions!(s, s.skillTest!, a)[0]!
    s = run(s, o.then)
    expect(s.assets[code]!.uses).toBe(1)
    expect(s.skillTest!.baseModifier).toBe(2)
    expect(b.testOptions!(s, s.skillTest!, s.assets[code]!)).toEqual([])
    expect(b.testOptions!(s, { ...s.skillTest!, investigator: 'b' }, a)).toEqual([])
    expect(b.limitTrait).toBe('Mask')
  },
)
it('Fox Mask remembers an enemy at the departed location even when that enemy follows', () => {
  let s = withAsset(location(foe(start())), '10067', { uses: 0 })
  s = dispatch(s, { type: 'MoveTo', investigator: 'a', location: 'B' })
  expect(s.enemies.foe!.location).toBe('B')
  expect(s.assets['10067']!.uses).toBe(1)
})
it('Mouse Mask replenishes on its controller revealing a location, to its printed initial count', () => {
  let s = withAsset(location(start(), 'B', { revealed: false }), '10043', { uses: 1 })
  s = dispatch(s, { type: 'RevealLocation', investigator: 'a', location: 'B' })
  expect(s.assets['10043']!.uses).toBe(2)
  const b = playerCardBehavior('10043')!
  expect(
    b.forced!(
      s,
      { type: 'afterPutLocation', investigator: 'b', location: 'B' },
      s.assets['10043']!,
    ),
  ).toEqual([])
  expect(
    b.forced!(
      s,
      { type: 'afterPutLocation', investigator: 'a', location: 'B' },
      s.assets['10043']!,
    ),
  ).toEqual([])
})
it('Sparrow Mask replenishes after actual investigator damage or horror', () => {
  let s = withAsset(start(), '10111', { uses: 0 })
  s = dispatch(s, { type: 'TakeDamage', investigator: 'a', damage: 1, horror: 0, direct: true })
  expect(me(s).damage).toBe(1)
  expect(s.assets['10111']!.uses).toBe(1)
})
it.each(['04159', '02309'])(
  '%s returns the exact owned committed skill immediately without canceling its results',
  (code) => {
    let s = test(withAsset(start(['a', 'b']), code))
    s = {
      ...s,
      skillTest: {
        ...s.skillTest!,
        investigator: 'b',
        committed: [
          { code: '01093', by: 'a' },
          { code: '01093', by: 'b' },
        ],
        succeeded: false,
      },
    }
    const b = playerCardBehavior(code)!,
      r = b.reactions!(
        s,
        { type: 'afterSkillTest', investigator: 'b', kind: 'effect', succeeded: false, margin: -1 },
        s.assets[code]!,
      )[0]!
    s = run(s, r.then)
    s = choose(s, 'choice.resourceReturn', { card: playerCardDef('01093')!.name })
    expect(me(s).hand.filter((c) => c === '01093')).toHaveLength(2)
    expect(s.skillTest!.committed[0]!.returnToHand).toBe(true)
    expect(s.skillTest!.committed[1]!.returnToHand).toBeUndefined()
    expect(s.assets[code]!.exhausted).toBe(true)
    expect(s.assets[code]!.uses).toBe(code === '04159' ? 2 : 0)
    s = dispatch(clear(s), { type: 'EndSkillTest' })
    expect(me(s).hand.filter((c) => c === '01093')).toHaveLength(2)
    expect(me(s).discard).not.toContain('01093')
  },
)
it.each([-2, 'skull'] as const)(
  'Sure Gamble reverses the modifier of %s while preserving its physical token',
  (face) => {
    let s = test(patch({ hand: ['01056'] })(start()))
    s = patch({ hand: ['01056'] })(s)
    s = { ...s, skillTest: { ...s.skillTest!, revealing: { token: face, face } } }
    const modifier = previewToken(s, face).modifier
    expect(modifier).toBeLessThan(0)
    const r = playerCardBehavior('01056')!.handReactions!(
      s,
      { type: 'afterRevealingChaosToken', investigator: 'a', token: face },
      'a',
    )[0]!
    s = run(s, r.then)
    s = dispatch(clear(s), { type: 'RevealChaosToken', pending: true, afterWindow: true })
    expect(s.skillTest!.tokenModifier).toBe(-modifier)
    expect(s.skillTest!.tokens).toContain(face)
  },
)
it('Eucatastrophe treats auto-fail as elder sign without inheriting automatic failure', () => {
  let s = test(start())
  s = patch({ hand: ['05324'] })(s)
  s = { ...s, skillTest: { ...s.skillTest!, revealing: { token: 'autoFail', face: 'autoFail' } } }
  const r = playerCardBehavior('05324')!.handReactions!(
    s,
    { type: 'afterRevealingChaosToken', investigator: 'a', token: 'autoFail' },
    'a',
  )[0]!
  s = run(s, r.then)
  expect(s.skillTest!.revealing).toMatchObject({ token: 'autoFail', face: 'elderSign' })
  s = dispatch(clear(s), { type: 'RevealChaosToken', pending: true, afterWindow: true })
  expect(s.skillTest!.autoFail).toBe(false)
  expect(s.skillTest!.tokens).toContain('elderSign')
})
it('Heavy Furs takes damage to cancel and redraw a symbol, even if the cost defeats it', () => {
  let s = test(withAsset(start(), '08126', { damage: playerCardDef('08126')!.health! - 1 }))
  s = {
    ...s,
    chaosBag: [0],
    skillTest: { ...s.skillTest!, revealing: { token: 'skull', face: 'skull' } },
  }
  const r = playerCardBehavior('08126')!.reactions!(
    s,
    { type: 'afterRevealingChaosToken', investigator: 'a', token: 'skull' },
    s.assets['08126']!,
  )[0]!
  s = run(s, r.then)
  expect(s.assets['08126']).toBeUndefined()
  expect([
    ...s.chaosBag,
    ...s.skillTest!.tokens,
    ...(s.skillTest?.revealing ? [s.skillTest.revealing.token] : []),
  ]).toContain('skull')
})
it('movement of uses to resources is not spending and does not trigger resource-gain effects', () => {
  registerPlayerCard({
    code: 'resource-observer',
    forced: (_s, t, a) =>
      t.type === 'afterGainResources'
        ? [{ type: 'TakeDamage', investigator: a.owner, damage: 0, horror: 1, direct: true }]
        : [],
  })
  let s = withAsset(withAsset(start(), 'resource-observer'), '05233', { uses: 3 })
  s = dispatch(s, { type: 'MoveUsesToResources', asset: '05233', investigator: 'a', amount: 2 })
  expect(me(s).resources).toBe(22)
  expect(me(s).horror).toBe(0)
  expect(s.assets['05233']!.uses).toBe(1)
})
