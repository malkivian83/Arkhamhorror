// RR: Fight, Costs, Skill Tests, Additional Actions, Uses, Health/Sanity, Tarot, Defeat.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  playerCardDef,
  registerPlayerCard,
  registerPlayerCards,
  registerTreachery,
  assetVitals,
  availableAbilities,
  actionsThisRound,
  type GameState,
  type Trigger,
  type Message,
} from '@lcg/engine'
import { choose, during, ghoul } from '@lcg/engine/testing'
import { game, patch, me, withAsset } from '../dunwich-pilot/testing'
import { setup, fight, resolve, enemy } from '../basic-abilities/testing'
import data from '../data/combat-support.json'
import './index'
const b = (c: string) => playerCardBehavior(c)!
const clean = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const start = () => patch({ hand: [], resources: 8 })(clean(game(['a', 'b'])))
const own = (code: string) => withAsset(start(), code)
const reaction = (s: GameState, c: string, t: Trigger) => b(c).reactions!(s, t, s.assets[c]!)
const use = (s: GameState, c: string, t: Trigger) => dispatch(s, ...reaction(s, c, t)[0]!.then)
registerPlayerCards([
  {
    code: 'support-health',
    name: 'Health only',
    type: 'asset',
    class: 'guardian',
    traits: ['Ally'],
    cost: 1,
    slots: [],
    health: 2,
    icons: { intellect: 1 },
  },
  {
    code: 'support-sanity',
    name: 'Sanity only',
    type: 'asset',
    class: 'guardian',
    traits: [],
    cost: 1,
    slots: [],
    sanity: 2,
  },
  {
    code: 'support-secret',
    name: 'Secret holder',
    type: 'asset',
    class: 'seeker',
    traits: ['Tome'],
    cost: 1,
    slots: [],
    uses: { count: 2, type: 'secret' },
  },
  {
    code: 'support-insight',
    name: 'Insight effect',
    type: 'event',
    class: 'seeker',
    traits: ['Insight'],
    cost: 3,
  },
])
registerPlayerCard({ code: 'support-insight', play: () => [] })
registerTreachery({
  code: 'support-tax',
  revelation: () => [],
  actionCost: (s, t, a) =>
    t.placement.type === 'threatArea' &&
    ['move', 'fight', 'evade'].includes(a.kind) &&
    !actionsThisRound(s, t.placement.investigator).some((k) =>
      ['move', 'fight', 'evade'].includes(k),
    )
      ? 1
      : 0,
})
it.each(data)('$code has a reviewed implementation', (c) => expect(b(c.code)).toBeDefined())
it.each([0, 1, 2])(
  'Chicago Typewriter spends %i extra actions for +2 per action and +2 damage',
  (n) => {
    let s = setup('02304')
    const before = me(s).actionsRemaining
    s = choose(s, 'choice.supportTypewriter', { n })
    expect(s.skillTest!.baseModifier).toBe(2 * (1 + n))
    expect(me(s).actionsRemaining).toBe(before - 1 - n)
    expect(s.assets['02304']!.uses).toBe(3)
    s = resolve(s)
    expect(enemy(s).damageTaken).toBe(3)
    expect(s.resolvingAssetActions).toBeUndefined()
  },
)
it('Chicago Typewriter counts mandatory additional actions, and the first-fight tax is not paid twice', () => {
  let s = setup('02304')
  s = during(s, (s) => ({
    ...s,
    treacheries: {
      tax: {
        id: 'tax',
        code: 'support-tax',
        name: 'Action tax',
        kind: 'treachery',
        keywords: [],
        placement: { type: 'threatArea', investigator: 'a' },
      },
    },
  }))
  s = choose(s, 'choice.supportTypewriter', { n: 0 })
  expect(s.skillTest!.baseModifier).toBe(4)
  expect(me(s).actionsRemaining).toBe(1)
  s = resolve(s)
  expect(availableAbilities(s, 'a').find((a) => a.key.startsWith('02304:fight'))!.actions).toBe(1)
})
it.each(['ready', 'damage'])(
  'Beretta at a margin of two chooses %s before damage is dealt',
  (choice) => {
    let s = setup('60331')
    s = fight(s, '60331')
    s = { ...s, skillTest: { ...s.skillTest!, baseSkill: 0, baseModifier: 4, difficulty: 2 } }
    s = resolve(s)
    s = choose(s, choice === 'ready' ? 'choice.supportReady' : 'choice.supportDamage')
    expect(s.assets['60331']!.exhausted).toBe(choice !== 'ready')
    expect(enemy(s).damageTaken).toBe(choice === 'ready' ? 2 : 3)
  },
)
it('Beretta at a margin of four applies both benefits; below two and on failure it gets neither', () => {
  let s = fight(setup('60331'), '60331')
  s = resolve(s)
  expect(enemy(s).damageTaken).toBe(3)
  expect(s.assets['60331']!.exhausted).toBe(false)
  s = fight(setup('60331'), '60331')
  s = resolve(s, 'autoFail')
  expect(enemy(s).damageTaken).toBe(0)
  expect(s.assets['60331']!.exhausted).toBe(true)
})
it('Mauser fires only while ready, spends its shell, and reloads to one shell by exhausting', () => {
  let s = fight(setup('11119'), '11119')
  expect(s.assets['11119']!.uses).toBe(0)
  s = resolve(s)
  expect(enemy(s).damageTaken).toBe(4)
  s = choose(s, 'choice.supportReload')
  expect(s.assets['11119']!.uses).toBe(1)
  expect(s.assets['11119']!.exhausted).toBe(true)
  expect(b('11119').abilities!(s, s.assets['11119']!, 'a')).toEqual([])
})
it('Storm Ruler adds willpower, resolves standard damage first, then can damage another local enemy by up to three symbols', () => {
  let s = setup('11115')
  s = fight(s, '11115')
  expect(s.skillTest!.baseModifier).toBe(me(s).skills.willpower)
  s = choose({ ...s, chaosBag: ['skull'] }, 'choice.revealToken')
  s = choose(s, 'choice.applyResults')
  expect(enemy(s).damageTaken).toBe(1)
  s = choose(s, 'choice.supportStorm')
  expect(enemy(s).damageTaken).toBe(2)
  expect(s.assets['11115']!.exhausted).toBe(true)
  const a = s.assets['11115']!
  const t = {
    ...s.lastSkillTest!.origin,
    tokens: ['skull', 'cultist', 'tablet', 'elderThing'],
    succeeded: true,
  }
  let state = clean(s)
  state = {
    ...state,
    assets: { ...state.assets, [a.id]: { ...a, exhausted: false } },
    skillTest: { ...state.skillTest!, ...t } as import('@lcg/engine').SkillTest,
  }
  const effects = b('11115').effect!(state, 'a', 'storm', { asset: a.id })
  expect((effects[0] as Extract<Message, { type: 'Ask' }>).question.choices[0]!.params?.n).toBe(3)
})
it('Storm Ruler may attack while exhausted, but ignored/canceled tokens grant no bonus damage', () => {
  let s = setup('11115', { asset: { exhausted: true } })
  s = fight(s, '11115')
  s = resolve(s)
  expect(enemy(s).damageTaken).toBe(1)
  const base = own('11115'),
    live = {
      ...base,
      skillTest: {
        ...setup('11115').skillTest!,
        succeeded: true,
        tokens: [0],
        ignoredTokens: ['skull'],
      } as import('@lcg/engine').SkillTest,
    }
  expect(b('11115').effect!(live, 'a', 'storm', { asset: '11115' })).toEqual([])
})
it('Blackmail File tests printed health, ignores Elite targets, disengages and grants Aloof only for the round', () => {
  let s = setup('10064')
  s = choose(s, 'choice.supportParley')
  expect(s.skillTest!.difficulty).toBe(10)
  expect(s.skillTest!.tags).toContain('parley')
  s = { ...s, skillTest: { ...s.skillTest!, baseSkill: 20 } }
  s = resolve(s)
  expect(enemy(s).engagedWith).toBeNull()
  expect(enemy(s).roundKeywords).toContainEqual({ keyword: 'aloof', round: s.round })
  const e = enemy(s)
  expect(
    b('10064').abilities!(
      { ...s, enemies: { [e.id]: { ...e, traits: ['Elite'] } } },
      s.assets['10064']!,
      'a',
    ),
  ).toEqual([])
})
it('Dreamer’s Chronicle gives only its owner’s first committed card a wild icon and may pay horror for an extra clue', () => {
  let s = setup('60255', { enemy: null })
  s = choose(s, 'ability.investigateWith', { card: playerCardDef('60255')!.name })
  expect(s.assets['60255']!.uses).toBe(3)
  s = dispatch(patch({ hand: ['support-health', 'support-health'] })({ ...s, pending: null }), {
    type: 'CommitWindow',
  })
  s = choose(s, 'choice.commit', { card: 'Health only' })
  expect(s.skillTest!.committed[0]!.iconBonus?.wild).toBe(1)
  s = choose(s, 'choice.commit', { card: 'Health only' })
  expect(s.skillTest!.committed[1]!.iconBonus?.wild ?? 0).toBe(0)
  s = resolve(s)
  s = choose(s, 'choice.supportHorrorClue')
  if (s.pending?.question.prompt === 'prompt.assignHorror')
    s = choose(s, 'choice.assignToInvestigator')
  expect(me(s).horror).toBe(1)
  expect(me(s).clues).toBe(2)
})
it('Autopsy Report exhausts on a local defeat and investigates with printed health capped at five', () => {
  const s = setup('60276'),
    e = enemy(s),
    t = { type: 'enemyDefeated' as const, enemy: { ...e, health: 2, maxHealth: 10 } }
  const out = use(clean(s), '60276', t)
  expect(out.skillTest!.baseModifier).toBe(2)
  expect(out.assets['60276']!.exhausted).toBe(true)
  const cap = reaction(clean(s), '60276', { ...t, enemy: { ...e, health: 8 } })[0]!.then.find(
    (m) => m.type === 'BeginSkillTest',
  )!
  expect(cap).toMatchObject({ modifier: 5 })
  expect(reaction(clean(s), '60276', { ...t, enemy: { ...e, location: 'B' } })).toEqual([])
})
it('On Their Heels pays one lead and exhausts after entering a location with enemies, with a clue or damage choice', () => {
  const s = setup('11120'),
    t = { type: 'afterMove' as const, investigator: 'a', first: true }
  let out = use(clean(s), '11120', t)
  out = choose(out, 'choice.supportClue')
  expect(me(out).clues).toBe(1)
  expect(out.assets['11120']!.uses).toBe(4)
  expect(out.assets['11120']!.exhausted).toBe(true)
  out = use(clean(s), '11120', t)
  out = choose(out, 'choice.supportEnemyDamage')
  expect(enemy(out).damageTaken).toBe(1)
  expect(reaction({ ...clean(s), enemies: {} }, '11120', t)).toEqual([])
  expect(reaction(out, '11120', t)).toEqual([])
})
it('Archibald grants intellect and lets any controlled secrets pay for an Insight, without double-counting donors', () => {
  let s = withAsset(own('11117'), 'support-secret', { uses: 2 })
  s = patch({ hand: ['support-insight'], resources: 0 })(s)
  expect(
    b('11117').usesAsResourcesAura!(
      s,
      s.assets['11117']!,
      s.assets['support-secret']!,
      'b',
      'support-insight',
    ),
  ).toBe(false)
  expect(
    b('11117').skillModifier!(s, s.assets['11117']!, {
      skill: 'intellect',
    } as import('@lcg/engine').SkillTest),
  ).toBe(1)
  s = dispatch(s, { type: 'PlayCard', investigator: 'a', code: 'support-insight', byEffect: true })
  s = choose(s, 'choice.payWithUses', { n: 1 })
  expect(me(s).resources).toBe(0)
  expect(me(s).discard).toContain('support-insight')
  expect(s.assets['11117']!.uses).toBe(3)
  expect(s.assets['support-secret']!.uses).toBe(0)
})
it.each(['54001', '54011'])(
  '%s can be put into play from each opening-hand copy without paying resources',
  (code) => {
    let s = patch({ hand: [code] })(start())
    const opts = b(code).openingHandReactions!(s, 'a', [code, code])
    expect(opts).toHaveLength(2)
    expect(opts[0]!.key).not.toBe(opts[1]!.key)
    s = dispatch(s, ...opts[0]!.then)
    expect(Object.values(s.assets).some((a) => a.code === code)).toBe(true)
    expect(me(s).resources).toBe(8)
    expect(me(s).hand).not.toContain(code)
  },
)
it('The Fool offers a real optional discount, pays and exhausts once, and does not trigger on put-into-play', () => {
  let s = patch({ hand: ['support-health'] })(own('54011'))
  s = dispatch(s, { type: 'PlayCard', investigator: 'a', code: 'support-health', byEffect: true })
  s = choose(s, 'choice.playEconomyModifier', { asset: playerCardDef('54011')!.name })
  expect(me(s).resources).toBe(8)
  expect(s.assets['54011']!.exhausted).toBe(true)
  const out = dispatch(own('54011'), {
    type: 'PutAssetIntoPlay',
    investigator: 'a',
    code: 'support-health',
  })
  expect(out.assets['54011']!.exhausted).toBe(false)
})
it('The Star raises only existing health/sanity on controlled assets; stacks and does not help another investigator', () => {
  let s = withAsset(withAsset(own('54001'), 'support-health'), 'support-sanity')
  s = withAsset(s, 'support-health', { id: 'other', owner: 'b' })
  expect(assetVitals(s.assets['support-health']!, s)).toEqual({ health: 3 })
  expect(assetVitals(s.assets['support-sanity']!, s)).toEqual({ sanity: 3 })
  expect(assetVitals(s.assets.other!, s)).toEqual({ health: 2 })
  expect(assetVitals(s.assets['54001']!, s)).toEqual({})
  s = withAsset(s, '54001', { id: 'second-star' })
  expect(assetVitals(s.assets['support-health']!, s)).toEqual({ health: 4 })
})
it('The Star allows assigning damage beyond printed health, and losing its bonus immediately defeats a filled asset', () => {
  let s = withAsset(own('54001'), 'support-health')
  s = dispatch(s, { type: 'DamageAsset', asset: 'support-health', damage: 2, horror: 0 })
  expect(s.assets['support-health']).toBeDefined()
  s = dispatch(s, { type: 'DiscardAsset', asset: '54001' })
  expect(s.assets['support-health']).toBeUndefined()
  expect(me(s).discard).toContain('support-health')
})

it('blanking The Star removes the aura and defeats a filled asset immediately', () => {
  registerTreachery({ code: 'support-blank', revelation: () => [], blanksAssetTrait: 'Tarot' })
  let s = withAsset(own('54001'), 'support-health', { damage: 2 })
  s = {
    ...s,
    treacheries: {
      blank: {
        id: 'blank',
        code: 'support-blank',
        name: 'Blank Tarot',
        kind: 'treachery',
        keywords: [],
        placement: { type: 'limbo' },
      },
    },
  }
  s = dispatch(s, {
    type: 'PlaceTreachery',
    treachery: 'blank',
    placement: { type: 'threatArea', investigator: 'a' },
  })
  expect(s.assets['support-health']).toBeUndefined()
})

it('Storm Ruler still deals its standard damage when that damage defeats the only enemy', () => {
  let s = fight(setup('11115', { enemy: { ...ghoul, health: 1 } }), '11115')
  s = resolve(s, 'skull')
  expect(Object.keys(s.enemies)).toHaveLength(0)
  expect(s.assets['11115']!.exhausted).toBe(false)
})
it.each([true, false])(
  'Crystal Pendulum draws for the exact predicted success/failure margin (%s)',
  (success) => {
    let s = own('60411')
    const hand = me(s).hand.length
    s = dispatch(
      { ...s, interactive: true },
      {
        type: 'BeginSkillTest',
        investigator: 'a',
        skill: 'intellect',
        baseSkill: success ? 3 : 0,
        difficulty: success ? 1 : 2,
        kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
      },
    )
    s = choose(s, 'choice.fieldAbility', { card: playerCardDef('60411')!.name })
    s = choose(s, 'choice.supportPredict', { n: 2 })
    s = resolve(s)
    expect(me(s).hand).toHaveLength(hand + 1)
    expect(s.assets['60411']!.exhausted).toBe(true)
  },
)
it('Crystal Pendulum can name numbers above nine, predicts another local investigator, and grants only its controller the reward', () => {
  let s = own('60411')
  const hand = me(s).hand.length
  s = dispatch(
    { ...s, interactive: true },
    {
      type: 'BeginSkillTest',
      investigator: 'b',
      skill: 'intellect',
      baseSkill: 13,
      difficulty: 1,
      kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
    },
  )
  s = choose(s, 'choice.fieldAbility')
  s = choose(s, 'choice.supportPredictNext')
  s = choose(s, 'choice.supportPredict', { n: 12 })
  s = resolve(s)
  expect(me(s).hand).toHaveLength(hand + 1)
  expect(s.investigators[1]!.hand).toHaveLength(5)
  const remote = patch({ location: 'B' }, 'b')(own('60411'))
  expect(reaction(remote, '60411', { type: 'afterSkillTestInitiated', investigator: 'b' })).toEqual(
    [],
  )
})
it('Crystal Pendulum grants willpower and draws nothing for the wrong prediction', () => {
  let s = own('60411')
  const hand = me(s).hand.length
  expect(
    b('60411').skillModifier!(s, s.assets['60411']!, {
      skill: 'willpower',
    } as import('@lcg/engine').SkillTest),
  ).toBe(1)
  s = dispatch(
    { ...s, interactive: true },
    {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'intellect',
      difficulty: 1,
      kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
    },
  )
  s = choose(s, 'choice.fieldAbility')
  s = choose(s, 'choice.supportPredict', { n: 0 })
  s = resolve(s)
  expect(me(s).hand).toHaveLength(hand)
})
it('The Star is included both when offering damage recipients and when finalizing assigned damage', () => {
  let s = withAsset({ ...own('54001'), interactive: true }, 'support-health', { damage: 1 })
  s = dispatch(s, { type: 'AssignDamage', investigator: 'a', damage: 1, horror: 0 })
  s = choose(s, 'choice.assignToAsset', { card: 'Health only' })
  expect(s.assets['support-health']!.damage).toBe(2)
  s = dispatch(clean(s), { type: 'AssignDamage', investigator: 'a', damage: 1, horror: 0 })
  expect(s.pending!.question.choices.some((c) => c.params?.card === 'Health only')).toBe(true)
  s = choose(s, 'choice.assignToAsset', { card: 'Health only' })
  expect(s.assets['support-health']).toBeUndefined()
})
