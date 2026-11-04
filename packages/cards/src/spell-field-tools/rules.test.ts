// RR: Costs, Uses, Damage/Horror, Deckbuilding, Skill Tests, Moving, Reaction Opportunities.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  playerCardDef,
  registerScenario,
  registerPlayerCard,
  registerPlayerCards,
  type GameState,
  type SkillTest,
} from '@lcg/engine'
import { choose, ghoul } from '@lcg/engine/testing'
import { game, patch, me, withAsset } from '../dunwich-pilot/testing'
import { setup, fight, evade, resolve, enemy, name } from '../basic-abilities/testing'
import { cardPool, investigatorCards, investigatorTraitsAllow, validateDeck } from '../decks'
import './index'
const b = (code: string) => playerCardBehavior(code)!
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const start = () =>
  patch({ hand: [], deck: ['01088', '01088', '01088', '01088'], discard: [], resources: 8 })(
    clear(game(['a', 'b'])),
  )
const asset = (code: string, changes: Parameters<typeof withAsset>[2] = {}) =>
  withAsset(start(), code, changes)
const reaction = (
  s: GameState,
  code: string,
  t: Parameters<NonNullable<ReturnType<typeof b>['reactions']>>[1],
) => b(code).reactions!(s, t, s.assets[code]!)
const use = (s: GameState, code: string, t: Parameters<typeof reaction>[2]) =>
  dispatch(s, ...reaction(s, code, t)[0]!.then)
const test = (s: GameState): SkillTest =>
  dispatch(
    { ...s, interactive: true },
    {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'intellect',
      difficulty: 1,
      kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
    },
  ).skillTest!

it('Arcane Experience starts in play with an extra arcane slot; Locked and Loaded adds ammo only to firearms', () => {
  expect(b('60478').permanent).toEqual({ slots: { arcane: 1 } })
  let s = dispatch(asset('11030'), { type: 'PutAssetIntoPlay', investigator: 'a', code: '01016' })
  expect(Object.values(s.assets).find((a) => a.code === '01016')!.uses).toBe(
    playerCardDef('01016')!.uses!.count + 1,
  )
  s = dispatch(clear(s), { type: 'PutAssetIntoPlay', investigator: 'b', code: '01016' })
  expect(Object.values(s.assets).find((a) => a.code === '01016' && a.owner === 'b')!.uses).toBe(
    playerCardDef('01016')!.uses!.count,
  )
  expect(b('11030').initialUsesBonus!('60580')).toBe(0)
})
it('Jim reacts only to actual damage/horror taken, exhausts and grants a card and resource', () => {
  const s = asset('60479'),
    t = { type: 'afterTakeDamage' as const, investigator: 'a', damage: 0, horror: 1 }
  const out = use(s, '60479', t)
  expect(me(out).hand).toHaveLength(1)
  expect(me(out).resources).toBe(9)
  expect(out.assets['60479']!.exhausted).toBe(true)
  expect(reaction(out, '60479', t)).toEqual([])
  expect(reaction(s, '60479', { ...t, damage: 0, horror: 0 })).toEqual([])
  expect(reaction(s, '60479', { ...t, investigator: 'b' })).toEqual([])
  expect(b('60479').skillModifier!(s, s.assets['60479']!, { ...test(s), skill: 'willpower' })).toBe(
    1,
  )
})
it('Daniel repeats a failed fight or evasion after its consequences, with +1 and without paying again', () => {
  let s = setup('60555')
  s = choose(s, 'action.fight', { enemy: enemy(s).name })
  s = resolve(s, 'autoFail')
  expect(s.pending?.question.choices.some((c) => c.label === 'choice.fieldAbility')).toBe(true)
  const actions = me(s).actionsRemaining
  s = choose(s, 'choice.fieldAbility', { card: name('60555') })
  expect(s.skillTest?.baseModifier).toBe(1)
  expect(me(s).actionsRemaining).toBe(actions)
  expect(s.assets['60555']!.exhausted).toBe(true)
})
it('Same Old Thing pays a nearby investigator’s event cost using supplies and discards when empty', () => {
  const s = asset('60561', { uses: 2 }),
    a = s.assets['60561']!
  expect(b('60561').usesAsResources!(s, a, 'b', '01088')).toBe(true)
  expect(b('60561').usesAsResources!(patch({ location: 'B' }, 'b')(s), a, 'b', '01088')).toBe(false)
  expect(b('60561').usesAsResources!(s, a, 'a', '01016')).toBe(false)
  const empty = dispatch(s, { type: 'SpendUses', asset: a.id, amount: 2 })
  expect(empty.assets[a.id]).toBeUndefined()
  expect(me(empty).discard).toContain('60561')
})
it('Hunting Dog moves one step toward a newly spawned enemy and cannot trigger exhausted', () => {
  const s = asset('60556')
  const opts = reaction(s, '60556', { type: 'enemySpawned', enemy: 'foe', location: 'B' })
  expect(opts.length).toBeGreaterThan(0)
  const out = dispatch(s, ...opts[0]!.then)
  expect(me(out).location).toBe('B')
  expect(out.assets['60556']!.exhausted).toBe(true)
  expect(reaction(out, '60556', { type: 'enemySpawned', enemy: 'foe', location: 'A' })).toEqual([])
})
it('Devil moves damage without healing or dealing it, then explodes when defeated', () => {
  let s = patch({ damage: 2 })(asset('10119', { damage: 2 }))
  s = {
    ...s,
    enemies: {
      foe: {
        ...ghoul,
        id: 'foe',
        location: 'A',
        engagedWith: null,
        exhausted: false,
        maxHealth: 8,
        damageTaken: 0,
        doom: 0,
      },
    },
  }
  const out = dispatch(s, { type: 'Forced', trigger: { type: 'turnBegins', investigator: 'a' } })
  expect(out.assets['10119']).toBeUndefined()
  expect(me(out).damage).toBe(3)
  expect(out.investigators[1]!.damage).toBe(2)
  expect(out.enemies.foe!.damageTaken).toBe(2)
})
it.each([1, 2, 3, 4, 5, 6])('Antikythera resolves the exact success margin %s', (margin) => {
  const s = asset('11049'),
    opts = reaction(s, '11049', {
      type: 'afterSkillTest',
      investigator: 'a',
      kind: 'effect',
      succeeded: true,
      margin,
    })
  if (margin === 6) {
    expect(opts).toEqual([])
    return
  }
  const out = dispatch(s, ...opts[0]!.then)
  expect(out.assets['11049']!.exhausted).toBe(true)
  if ([1, 3].includes(margin)) expect(me(out).clues).toBe(1)
  if ([2, 4].includes(margin)) {
    expect(me(out).hand).toHaveLength(1)
    expect(me(out).resources).toBe(9)
  }
  if (margin === 5) expect(me(out).nextTurnBenefits?.some((e) => e.actions === 1)).toBe(true)
})
it('Alice protects the first investigate action, but later investigations provoke; discovering clues exhausts her for damage', () => {
  let s = setup('11027')
  const base = me(s).damage
  s = choose(s, 'action.investigate')
  expect(me(s).damage).toBe(base)
  s = resolve(s, 0)
  s = choose(s, 'choice.fieldAbility', { card: name('11027') })
  if (s.pending?.question.choices.some((c) => c.label === 'choice.enemy'))
    s = choose(s, 'choice.enemy', { enemy: enemy(s).name })
  expect(enemy(s).damageTaken).toBe(1)
  s = choose(s, 'action.investigate')
  expect(s.pending?.question.choices.some((c) => c.label === 'choice.assignToInvestigator')).toBe(
    true,
  )
  while (s.pending?.question.choices.some((c) => c.label === 'choice.assignToInvestigator'))
    s = choose(s, 'choice.assignToInvestigator')
  expect(me(s).damage).toBeGreaterThan(base)
})
it('Occult Records heals another local investigator, spending and exhausting before its willpower test', () => {
  const s = patch({ horror: 3 }, 'b')(asset('60256', { uses: 3 })),
    a = s.assets['60256']!
  const o = b('60256').fastOptions!(s, a).find(
    (o) => o.target?.type === 'investigator' && o.target.id === 'b',
  )!
  const out = dispatch({ ...s, interactive: true }, ...o.then)
  expect(out.investigators[1]!.horror).toBe(1)
  expect(out.assets[a.id]).toMatchObject({ uses: 2, exhausted: true })
  expect(out.skillTest).toMatchObject({ investigator: 'a', skill: 'willpower', difficulty: 2 })
  expect(out.skillTest!.kind).toMatchObject({
    onFail: [{ type: 'DiscardRandomFromHand', investigator: 'a', amount: 1 }],
  })
})
it('the untranslated Scroll deals horror to its chosen target and completes research only on its last secret', () => {
  const s = asset('60259', { uses: 1 }),
    a = s.assets['60259']!
  const o = b('60259').abilities!(s, a, 'a').find((o) => o.params?.name === 'B')!
  const out = dispatch(s, ...(o.costs ?? []), ...o.then)
  expect(out.investigators[1]!.horror).toBe(1)
  expect(out.assets[a.id]).toBeUndefined()
  expect(me(out).hand).toHaveLength(3)
  expect(out.campaignLog?.notes).toContain('you have unearthed the secrets of the Pharaohs')
})
it.each(['60280', '60281'])(
  '%s spends exactly one or two secrets for distinct researched effects',
  (code) => {
    const s = { ...asset(code, { uses: 2 }), interactive: true }
    if (code === '60280') {
      const foe = {
        ...ghoul,
        id: 'foe',
        location: 'A',
        engagedWith: 'a',
        exhausted: false,
        maxHealth: 8,
        damageTaken: 0,
        doom: 0,
      }
      s.enemies = { foe }
    }
    const active = b(code).abilities!(s, s.assets[code]!, 'a')
    expect(active).toHaveLength(2)
    for (const [n, o] of active.entries()) {
      const out = dispatch(s, ...(o.costs ?? []), ...o.then)
      expect(me(out).horror).toBe(1)
      expect(out.assets[code]!.uses).toBe(1 - n)
      expect(out.skillTest).toMatchObject({ skill: 'intellect', baseModifier: 3 })
      expect(out.skillTest!.kind).toMatchObject(
        code === '60280' ? { extraDamage: n + 1 } : { extraClues: n + 1 },
      )
    }
    expect(
      b(code).abilities!(withAsset(s, code, { uses: 1 }), { ...s.assets[code]!, uses: 1 }, 'a'),
    ).toHaveLength(1)
    expect(b(code).requiredResearch).toBeDefined()
  },
)
it('Longbow attacks aloof enemies using agility for three damage and replenishes only a missing arrow', () => {
  let s = setup('60580', { enemy: { ...ghoul, health: 8, keywords: ['aloof'] }, engagedWith: null })
  s = fight(s, '60580', 'agility')
  expect(s.skillTest).toMatchObject({ skill: 'agility', baseModifier: 2, kind: { extraDamage: 2 } })
  s = resolve(s, 0)
  expect(enemy(s).damageTaken).toBe(3)
  expect(s.assets['60580']!.uses).toBe(0)
  s = choose(s, 'ability.combatReload', { card: name('60580') })
  expect(s.assets['60580']!.uses).toBe(1)
  expect(
    b('60580').abilities!(clear(s), s.assets['60580']!, 'a').some((o) => o.key.endsWith(':reload')),
  ).toBe(false)
})
it('Dread Curse adds doom as cost, removes one on defeat and all on its printed bad symbols', () => {
  let s = fight(setup('60474', { enemy: { ...ghoul, health: 2 } }), '60474', 'willpower')
  expect(s.assets['60474']!.doom).toBe(1)
  s = resolve(s, 0)
  expect(s.assets['60474']!.doom).toBe(0)
  s = fight(setup('60474', { asset: { doom: 3 } }), '60474', 'willpower')
  s = resolve(s, 'skull')
  expect(s.assets['60474']!.doom).toBe(0)
})
it('Ritual Dagger adds willpower and shuffles a resolved Spell event only after its effects', () => {
  const s = asset('60475')
  const fighting = clear(setup('60475'))
  expect(b('60475').abilities!(fighting, fighting.assets['60475']!, 'a')[0]!.then[0]).toMatchObject(
    { modifier: 3 },
  )
  const out = dispatch(
    { ...patch({ hand: ['60416'] })(s), chaosBag: [0] },
    { type: 'PlayCard', investigator: 'a', code: '60416' },
  )
  expect(me(out).resources).toBe(9)
  expect(out.pending?.question.choices.some((c) => c.label === 'choice.fieldAbility')).toBe(true)
  const shuffled = choose(out, 'choice.fieldAbility', { card: name('60475') })
  expect(me(shuffled).deck).toContain('60416')
  expect(me(shuffled).discard).not.toContain('60416')
  expect(me(shuffled).damage).toBe(1)
  expect(shuffled.assets['60475']!.exhausted).toBe(true)
})
it.each(['60461', '60482'])(
  '%s evades without spending a charge and optionally spends one to move',
  (code) => {
    let s = evade(setup(code), code, 'willpower')
    const initial = s.assets[code]!.uses
    expect(s.assets[code]!.uses).toBe(initial)
    s = resolve(s, 0)
    expect(s.pending?.question.choices.some((c) => c.label === 'choice.skip')).toBe(true)
    s = choose(s, 'choice.pilotMove', { location: 'Room B' })
    expect(me(s).location).toBe('B')
    expect(s.assets[code]!.uses).toBe(initial - 1)
    const penalty = b(code).onTokenRevealed!(s, 'tablet', { ...s.assets[code]!, uses: 0 })
    expect(penalty).toEqual([
      { type: 'LoseActions', investigator: 'a', amount: 1 },
      { type: 'DiscardAsset', asset: code },
    ])
    expect(b(code).onTokenRevealed!(s, 'skull', s.assets[code]!)).toEqual([])
  },
)
it('Voice of Ra reveals three physical tokens without replacement, counts symbols and returns them', () => {
  const s = { ...start(), chaosBag: [0, 'skull', 'elderSign'] as const } as unknown as GameState
  const out = dispatch(patch({ hand: ['60416'] })(s), {
    type: 'PlayCard',
    investigator: 'a',
    code: '60416',
  })
  expect(me(out).resources).toBe(11) // cost 0, base 1 and one symbol x 2
  expect([...out.chaosBag].map(String).sort()).toEqual(['0', 'elderSign', 'skull'].sort())
  expect(out.tokenReveal).toBeUndefined()
})
it('Voice of Ra preserves the token group through a cancellation and a serialized reaction window', () => {
  const code = 'field-token-cancel'
  registerPlayerCards([
    {
      code,
      name: 'Test token canceller',
      type: 'asset',
      class: 'neutral',
      traits: [],
      icons: {},
      slots: [],
      story: true,
    },
  ])
  registerPlayerCard({
    code,
    reactions: (_s, t, a) =>
      t.type === 'whenRevealChaosToken' && !a.exhausted
        ? [
            {
              key: a.id,
              investigator: a.owner,
              label: 'choice.fieldAbility',
              params: { card: 'Test token canceller' },
              then: [
                { type: 'ExhaustAsset', asset: a.id },
                { type: 'CancelRevealedToken', redraw: true, use: a.id },
              ],
            },
          ]
        : [],
  })
  const s = {
    ...withAsset(patch({ hand: ['60416'] })(start()), code),
    chaosBag: [0, 'skull', 'elderSign'] as const,
  } as unknown as GameState
  let out = dispatch(s, { type: 'PlayCard', investigator: 'a', code: '60416' })
  expect(out.tokenReveal?.hold).toBe(true)
  out = choose(JSON.parse(JSON.stringify(out)) as GameState, 'choice.fieldAbility', {
    card: 'Test token canceller',
  })
  expect(me(out).resources).toBe(11)
  expect(out.chaosBag.map(String).sort()).toEqual(['0', 'elderSign', 'skull'].sort())
  expect(out.tokenReveal).toBeUndefined()
})
it('Favor pays its additional damage and discounts a Spell/Ritual asset by three', () => {
  const out = dispatch(patch({ hand: ['60463', '01060'], resources: 2 })(start()), {
    type: 'PlayCard',
    investigator: 'a',
    code: '60463',
  })
  expect(me(out).damage).toBe(1)
  expect(Object.values(out.assets).some((a) => a.code === '01060')).toBe(true)
  expect(me(out).resources).toBe(2)
})
it('Favor still pays its additional damage when a scenario cancels its effects', () => {
  registerScenario({ id: 'field-cancel-effects', eventPlayed: () => [] })
  const s = { ...patch({ hand: ['60463', '01060'] })(start()), scenarioId: 'field-cancel-effects' }
  const out = dispatch(s, { type: 'PlayCard', investigator: 'a', code: '60463' })
  expect(me(out).damage).toBe(1)
  expect(me(out).hand).toContain('01060')
  expect(Object.values(out.assets)).toHaveLength(0)
})
it('moving damage to an investigator does not trigger Jim’s reaction for taking damage', () => {
  const s = patch({ damage: 1 }, 'b')(asset('60479'))
  const out = dispatch(s, {
    type: 'MoveDamage',
    from: { type: 'investigator', id: 'b' },
    to: { type: 'investigator', id: 'a' },
    kind: 'damage',
  })
  expect(me(out).damage).toBe(1)
  expect(out.investigators[1]!.damage).toBe(0)
  expect(out.pending).toBeNull()
  expect(me(out).resources).toBe(8)
  expect(
    dispatch(out, {
      type: 'MoveDamage',
      from: { type: 'investigator', id: 'b' },
      to: { type: 'investigator', id: 'a' },
      kind: 'damage',
    }).investigators,
  ).toEqual(out.investigators)
})
it('Mirror Form puts an asset into play without paying and shuffles only that surviving instance at round end', () => {
  const s = patch({ hand: ['60465', '01060'], resources: 2 })(start())
  const out = dispatch(s, { type: 'PlayCard', investigator: 'a', code: '60465' })
  const entered = Object.values(out.assets).find((a) => a.code === '01060')!
  expect(entered).toBeDefined()
  expect(me(out).resources).toBe(1)
  expect(out.endOfRound).toHaveLength(1)
  const done = dispatch(clear(out), ...out.endOfRound!)
  expect(done.assets[entered.id]).toBeUndefined()
  expect(me(done).deck).toContain('01060')
  const gone = { ...out, assets: {} }
  expect(b('60465').effect!(gone, 'a', 'return', { asset: entered.id })).toEqual([])
})
it('Commune chooses up to three horror before testing and uses total horror, capped at four extra clues', () => {
  let s = dispatch(
    { ...patch({ hand: ['60282'], horror: 2, resources: 10 })(start()), interactive: true },
    { type: 'PlayCard', investigator: 'a', code: '60282' },
  )
  s = choose(s, 'choice.fieldHorror', { n: 3 })
  expect(me(s).horror).toBe(5)
  expect(s.skillTest).toMatchObject({
    skill: 'intellect',
    baseModifier: 2,
    kind: { extraClues: 4 },
  })
})
it('Stock Ammo Reload lets its owner distribute all five ammo among their firearms', () => {
  const s = withAsset(asset('01016', { uses: 0 }), '01047', { uses: 0 })
  let out = dispatch(patch({ hand: ['60175'] })(s), {
    type: 'PlayCard',
    investigator: 'a',
    code: '60175',
  })
  for (let n = 0; n < 5; n++)
    out = choose(out, 'choice.fieldAbility', { card: name(n < 2 ? '01016' : '01047') })
  expect(out.assets['01016']!.uses).toBe(2)
  expect(out.assets['01047']!.uses).toBe(3)
})
it('Ready for Anything requires the first action, heals one horror, and draws two only after drawing an enemy this round', () => {
  const s = patch({ hand: ['11024'], horror: 2, drewEnemyRound: start().round })(start())
  const out = dispatch(s, { type: 'PlayCard', investigator: 'a', code: '11024' })
  expect(me(out).hand).toHaveLength(2)
  expect(me(out).horror).toBe(1)
  expect(b('11024').canPlay!(patch({ actionsTaken: 1 })(s), 'a')).toBe(false)
  const previous = dispatch(patch({ hand: ['11024'], drewEnemyRound: s.round - 1 })(start()), {
    type: 'PlayCard',
    investigator: 'a',
    code: '11024',
  })
  expect(me(previous).hand).toHaveLength(1)
})
it('Bound for the Horizon discards a non-weakness and exhausts to move only during its controller’s turn', () => {
  const s = patch({ hand: ['01088'] })(asset('11102')),
    a = s.assets['11102']!
  const o = b('11102').fastOptions!(s, a)[0]!,
    out = dispatch(s, ...o.then)
  expect(me(out).discard).toContain('01088')
  expect(me(out).location).toBe('B')
  expect(out.assets[a.id]!.exhausted).toBe(true)
  expect(b('11102').fastOptions!({ ...s, activeTurn: 'b' }, a)).toEqual([])
})
it('Walter rewards a successful parley once exhausted and modifies only parley tests', () => {
  const s = asset('11104'),
    t = { ...test(s), tags: ['parley'] }
  expect(b('11104').skillModifier!(s, s.assets['11104']!, t)).toBe(1)
  const out = use({ ...s, skillTest: t }, '11104', {
    type: 'afterSkillTest',
    investigator: 'a',
    kind: 'effect',
    succeeded: true,
    margin: 1,
  })
  expect(me(out).resources).toBe(9)
  expect(out.assets['11104']!.exhausted).toBe(true)
  expect(
    reaction(s, '11104', {
      type: 'afterSkillTest',
      investigator: 'a',
      kind: 'fight',
      succeeded: true,
      margin: 1,
    }),
  ).toEqual([])
})
it('True Awakening resolves two distinct options in either order', () => {
  let s = dispatch(patch({ hand: ['11106'], damage: 2, horror: 2 })(start()), {
    type: 'PlayCard',
    investigator: 'a',
    code: '11106',
  })
  s = choose(s, 'choice.fieldhorror')
  expect(s.pending?.question.choices.some((c) => c.label === 'choice.fieldhorror')).toBe(false)
  s = choose(s, 'choice.fielddraw')
  expect(me(s).horror).toBe(1)
  expect(me(s).hand).toHaveLength(2)
  expect(me(s).damage).toBe(2)
})
it('Dakota boosts only with a local Creature/Monster and moves to and engages a nearby enemy', () => {
  const s = asset('11110'),
    a = s.assets['11110']!,
    foe = {
      ...ghoul,
      id: 'foe',
      location: 'B',
      engagedWith: null,
      exhausted: false,
      maxHealth: 8,
      damageTaken: 0,
      doom: 0,
    }
  const local = { ...s, enemies: { foe: { ...foe, location: 'A', traits: ['Monster'] } } }
  expect(b('11110').skillModifier!(local, a, { ...test(s), skill: 'combat' })).toBe(1)
  expect(b('11110').skillModifier!(s, a, { ...test(s), skill: 'combat' })).toBe(0)
  const near = { ...s, enemies: { foe } },
    out = dispatch(near, ...b('11110').fastOptions!(near, a)[0]!.then)
  expect(me(out).location).toBe('B')
  expect(out.enemies.foe!.engagedWith).toBe('a')
  expect(out.assets[a.id]!.exhausted).toBe(true)
})
it('Sound Support can soak both kinds of damage for nearby investigators and heals itself at turn start', () => {
  const s = asset('11112', { damage: 1, horror: 1 })
  expect(b('11112').soaksAtLocation).toBe(true)
  let out = use(s, '11112', { type: 'turnBegins', investigator: 'a' })
  out = choose(out, 'choice.fielddamage')
  expect(out.assets['11112']).toMatchObject({ damage: 0, horror: 1 })
})
it('Trench Armor cancels only the first opportunity attack each round, including one not caused by its owner’s turn', () => {
  const s = { ...clear(setup('11113')), interactive: false, activeTurn: 'b' }
  const attack = {
    type: 'EnemyAttack' as const,
    investigator: 'a',
    enemy: enemy(s).id,
    exhaustAfter: false,
    opportunity: true,
  }
  const first = dispatch(s, attack)
  expect(me(first).damage + first.assets['11113']!.damage).toBe(0)
  expect(first.enemyAttacks?.[0]?.opportunity).toBe(true)
  let second = dispatch(first, attack)
  while (second.pending?.question.choices.some((c) => c.label === 'choice.assignToInvestigator'))
    second = choose(second, 'choice.assignToInvestigator')
  expect(me(second).damage + second.assets['11113']!.damage).toBeGreaterThan(0)
  const reequipped = withAsset({ ...first, assets: {} }, '11113')
  expect(
    b('11113').forced!(
      { ...reequipped, enemyAttacks: [...first.enemyAttacks!, ...first.enemyAttacks!] },
      { type: 'whenEnemyAttacks', investigator: 'a', enemy: attack.enemy, opportunity: true },
      reequipped.assets['11113']!,
    ),
  ).toEqual([])
  const next = dispatch({ ...reequipped, round: reequipped.round + 1 }, attack)
  expect(me(next).damage + next.assets['11113']!.damage).toBe(0)
})
it.each(['11102', '11104', '11106', '11110', '11112', '11113'])(
  '%s checks investigator traits in pool, purchase and validation even when neutral',
  (code) => {
    const card = playerCardDef(code)!,
      inv = investigatorCards(),
      allowed = inv.find((i) => investigatorTraitsAllow(i.code, card))!,
      denied = inv.find((i) => !investigatorTraitsAllow(i.code, card))!
    expect(allowed).toBeDefined()
    expect(denied).toBeDefined()
    expect(cardPool(allowed.code).some((c) => c.code === code)).toBe(true)
    expect(cardPool(denied.code).some((c) => c.code === code)).toBe(false)
    expect(
      validateDeck(
        { id: 'x', name: 'x', investigator: denied.code, cards: [code] },
        false,
      ).problems.some((p) => p.key === 'deck.problem.notAllowed'),
    ).toBe(true)
  },
)
