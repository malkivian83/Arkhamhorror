// RR: Costs, Uses, Exile, Cancel, Defeat, Search, Skill Tests ST.6/ST.7.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  type GameState,
  type Message,
  type AbilityOption,
  type Trigger,
} from '@lcg/engine'
import { choose, ghoul } from '@lcg/engine/testing'
import { game, patch, me, withAsset } from '../dunwich-pilot/testing'
import './index'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const start = (players = ['a']) =>
  patch({ hand: [], resources: 20, skills: { willpower: 8, intellect: 8, agility: 8, combat: 8 } })(
    { ...clear(game(players)), chaosBag: [0] },
  )
const run = (s: GameState, ms: Message[]) => ms.reduce((s, m) => dispatch(s, m), clear(s))
const b = (code: string) => playerCardBehavior(code)!
const options = (s: GameState, code: string) => b(code).abilities!(s, s.assets[code]!, 'a')
const activate = (s: GameState, o: AbilityOption) =>
  dispatch(clear(s), {
    type: 'UseAbility',
    investigator: 'a',
    key: o.key,
    actions: o.actions,
    provokes: o.provokes,
    ...(o.costs ? { costs: o.costs } : {}),
    then: o.then,
  })
const foe = (
  s: GameState,
  id = 'foe',
  changes: Partial<GameState['enemies'][string]> = {},
): GameState => ({
  ...s,
  enemies: {
    ...s.enemies,
    [id]: {
      ...ghoul,
      id,
      location: 'A',
      engagedWith: 'a',
      health: 20,
      maxHealth: 20,
      damageTaken: 0,
      exhausted: false,
      doom: 0,
      traits: ['Humanoid'],
      ...changes,
    },
  },
})
const clues = (s: GameState): GameState => ({
  ...s,
  locations: { ...s.locations, A: { ...s.locations.A!, clues: 10, shroud: 2, shroudModifier: 0 } },
})
const begin = (s: GameState, source?: string) =>
  dispatch(patch({ hand: ['01093'] })(clear(s)), {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'intellect',
    difficulty: 3,
    ...(source ? { source } : {}),
    kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
  })
const pendingHit = (s: GameState, target = 'a', damage = 2, horror = 2): GameState => ({
  ...clear(s),
  queue: [{ type: 'TakeDamage', investigator: target, damage, horror, damageWindowResolved: true }],
})
const handReaction = (s: GameState, code: string, t: Trigger) => b(code).handReactions!(s, t, 'a')
const fire = (s: GameState, ms: Message[]) =>
  ms.reduce<GameState>((s, m) => dispatch(s, m), { ...s, pending: null })
const hitTrigger = (target = 'a', damage = 2, horror = 2): Trigger => ({
  type: 'whenDealtDamage',
  investigator: target,
  damage,
  horror,
})
it.each(['03156', '03157'])(
  '%s exiles its resolving event with Wendy’s Amulet without removing another copy',
  (code) => {
    let s = withAsset(patch({ hand: [code], discard: [code], deck: [code] })(start()), '01014')
    if (code === '03156')
      s = {
        ...s,
        treacheries: {
          t: {
            id: 't',
            code: '01163',
            kind: 'treachery',
            name: 'Rotting Remains',
            keywords: [],
            placement: { type: 'limbo' },
          },
        },
      }
    else s = pendingHit(s)
    const trigger: Trigger =
      code === '03156'
        ? { type: 'whenTreacheryDrawn', investigator: 'a', treachery: 't' }
        : hitTrigger()
    s = fire(s, handReaction(s, code, trigger)[0]!.then)
    // The Amulet also offers the copy on top of the discard pile: play the one in hand.
    s = choose(s, 'choice.playFromHand')
    if (code === '03157') s = choose(s, 'choice.windowCancel', { damage: 2, horror: 2 })
    expect(s.exiled).toContainEqual({ investigator: 'a', code })
    expect(me(s).deck).toEqual([code])
    expect(me(s).discard).toEqual([code])
  },
)
it('A Test of Will protects a local investigator but respects weaknesses, canceled cards and Peril', () => {
  let s = patch({ location: 'A' }, 'b')(start(['a', 'b']))
  const t: Trigger = { type: 'whenTreacheryDrawn', investigator: 'b', treachery: 't' }
  s = {
    ...s,
    treacheries: {
      t: {
        id: 't',
        code: '01163',
        kind: 'treachery',
        name: 'Test',
        keywords: [],
        placement: { type: 'limbo' },
      },
    },
  }
  expect(handReaction(s, '03156', t)).toHaveLength(1)
  s = { ...s, treacheries: { t: { ...s.treacheries.t!, keywords: ['peril'] } } }
  expect(handReaction(s, '03156', t)).toEqual([])
  s = { ...s, treacheries: { t: { ...s.treacheries.t!, keywords: [], owner: 'b' } } }
  expect(handReaction(s, '03156', t)).toEqual([])
})
it('Devil’s Luck cancels a chosen mixed total up to ten from any damage source and exiles', () => {
  let s = pendingHit(patch({ hand: ['03157'] })(start()), 'a', 7, 5)
  s = fire(s, handReaction(s, '03157', hitTrigger('a', 7, 5))[0]!.then)
  expect(
    s
      .pending!.question.choices.filter((c) => c.label === 'choice.windowCancel')
      .every((c) => Number(c.params!.damage) + Number(c.params!.horror) <= 10),
  ).toBe(true)
  s = choose(s, 'choice.windowCancel', { damage: 7, horror: 3 })
  expect(me(s).damage).toBe(0)
  expect(me(s).horror).toBe(2)
  expect(me(s).discard).not.toContain('03157')
  expect(s.exiled).toContainEqual({ investigator: 'a', code: '03157' })
})
it.each(['11054', '11063'])(
  '%s lets the damaged investigator decide and pay for mixed cancellation',
  (code) => {
    let s = patch({ hand: [code], resources: 3 })(
      patch({ location: 'B', resources: 5 }, 'b')(start(['a', 'b'])),
    )
    s = pendingHit(s, 'b', 2, 2)
    s = fire(s, handReaction(s, code, hitTrigger('b'))[0]!.then)
    expect(s.pending!.investigator).toBe('b')
    s = choose(s, 'choice.protectionResource', { n: 3, damage: 2, horror: 1 })
    expect(s.investigators[1]!.resources).toBe(2)
    expect(me(s).resources).toBe(code === '11063' ? 6 : 3)
    expect(s.investigators[1]!.damage).toBe(0)
    expect(s.investigators[1]!.horror).toBe(1)
  },
)
it('You’ve Had Worse 4 cannot transfer resources to oneself (official April 2025 ruling)', () => {
  const s = pendingHit(start())
  expect(handReaction(s, '11063', hitTrigger())).toEqual([])
  expect(handReaction(s, '11054', hitTrigger())).toHaveLength(1)
})
it.each(['skull', 'cultist', 'tablet', 'elderThing'] as const)(
  'Counterspell cancels %s without a redraw or its immediate effect',
  (token) => {
    let s = begin(start())
    s = { ...s, skillTest: { ...s.skillTest!, revealing: { token, face: token } }, chaosBag: [] }
    const o = handReaction(s, '04110', {
      type: 'whenRevealChaosToken',
      investigator: 'a',
      token,
    })[0]!
    s = run(patch({ hand: ['04110'] })(s), o.then)
    expect(s.skillTest?.revealing).toBeUndefined()
    expect(s.skillTest?.tokenModifier).toBe(0)
    expect(s.chaosBag).toEqual([token])
  },
)
it('Counterspell excludes automatic failure, Elder Sign and numeric tokens', () => {
  for (const token of ['autoFail', 'elderSign', -3] as const) {
    let s = begin(start())
    s = { ...s, skillTest: { ...s.skillTest!, revealing: { token, face: token } } }
    expect(
      handReaction(s, '04110', { type: 'whenRevealChaosToken', investigator: 'a', token }),
    ).toEqual([])
  }
})
it('Fire Extinguisher 1 exiles as an evade cost and evades the other engaged enemies on success', () => {
  let s = withAsset(foe(foe(start()), 'other'), '02114')
  const o = options(s, '02114').find((o) => o.key.includes(':evade:'))!
  s = activate(s, o)
  expect(s.assets['02114']).toBeUndefined()
  expect(s.exiled).toContainEqual({ investigator: 'a', code: '02114' })
  expect(Object.values(s.enemies).every((e) => e.exhausted && e.engagedWith === null)).toBe(true)
})
it('Fire Extinguisher 3 distinguishes discarding from exile, preserves Elite and unevadable enemies', () => {
  let s = withAsset(
    foe(foe(foe(start()), 'elite', { traits: ['Elite'] }), 'immune', { cannotBeEvaded: true }),
    '08080',
  )
  s = activate(
    s,
    options(s, '08080').find((o) => o.key.endsWith(':exile'))!,
  )
  expect(s.enemies.foe).toBeUndefined()
  expect(s.enemies.elite!.exhausted).toBe(true)
  expect(s.enemies.immune!.exhausted).toBe(false)
  expect(s.exiled).toContainEqual({ investigator: 'a', code: '08080' })
  s = withAsset(foe(start()), '08080')
  s = activate(
    s,
    options(s, '08080').find((o) => o.key.endsWith(':evade'))!,
  )
  expect(s.enemies.foe!.exhausted).toBe(true)
  expect(me(s).discard).toContain('08080')
  expect(s.exiled).toBeUndefined()
})
it('Fire Extinguisher attack levels differ in damage', () => {
  for (const [code, damage] of [
    ['02114', 1],
    ['08080', 2],
  ] as const) {
    let s = withAsset(foe(start()), code)
    s = activate(s, options(s, code)[0]!)
    expect(s.enemies.foe!.damageTaken).toBe(damage)
  }
})
it('Agency Backup pays exhaustion and damage/horror before its effect, including defeat', () => {
  let s = withAsset(foe(clues(start())), '05274', { horror: 3 })
  expect(b('05274').soaksAtLocation).toBe(true)
  const o = b('05274').fastOptions!(s, s.assets['05274']!).find((o) => o.key.endsWith(':clue'))!
  s = run(s, o.then)
  expect(s.assets['05274']).toBeUndefined()
  expect(me(s).clues).toBe(1)
  s = withAsset(foe(start()), '05274')
  s = run(s, b('05274').fastOptions!(s, s.assets['05274']!)[0]!.then)
  expect(s.assets['05274']).toMatchObject({ damage: 1, exhausted: true })
  expect(s.enemies.foe!.damageTaken).toBe(1)
})
it('Tetsuo searches a chosen local discard or nine deck cards after his own defeat', () => {
  let s = withAsset(
    patch({ location: 'A', discard: ['01087', '01093'] }, 'b')(start(['a', 'b'])),
    '06155',
  )
  const a = s.assets['06155']!
  const o = b('06155').reactions!(s, { type: 'assetDefeated', asset: a }, a)[0]!
  s = run(s, o.then)
  s = choose(s, 'choice.protectionDiscard', { card: 'Flashlight' })
  expect(s.investigators[1]!.hand).toContain('01087')
  expect(s.investigators[1]!.discard).toEqual(['01093'])
  expect(
    b('06155').reactions!(s, { type: 'assetDefeated', asset: { ...a, id: 'another' } }, a),
  ).toEqual([])
})
it('Girish boosts another local test and heals only after success', () => {
  let s = withAsset(patch({ location: 'A' }, 'b')(start(['a', 'b'])), '09038', { damage: 1 })
  s = begin(s)
  s = { ...s, skillTest: { ...s.skillTest!, investigator: 'b' } }
  const o = b('09038').testOptions!(s, s.skillTest!, s.assets['09038']!)[0]!
  s = run(s, o.then)
  expect(s.skillTest!.baseModifier).toBe(2)
  expect(s.assets['09038']!.exhausted).toBe(true)
  expect(s.skillTest!.tokenOnSuccess).toHaveLength(1)
  s = run(s, s.skillTest!.tokenOnSuccess!)
  s = choose(s, 'choice.protectionHeal', { damage: 1, horror: 0 })
  expect(s.assets['09038']!.damage).toBe(0)
})
it.each(['fight', 'investigate'] as const)(
  'Ice Pick boosts %s and waits until ST.7 to discard and alter results',
  (kind) => {
    let s = withAsset(foe(clues(start())), '08107')
    s = begin({ ...s, skillTest: null })
    s = {
      ...s,
      skillTest: {
        ...s.skillTest!,
        kind:
          kind === 'fight'
            ? { type: 'fight', enemy: 'foe' }
            : { type: 'investigate', location: 'A' },
      },
    }
    s = run(s, b('08107').testOptions!(s, s.skillTest!, s.assets['08107']!)[0]!.then)
    expect(s.assets['08107']!.exhausted).toBe(true)
    s = { ...s, skillTest: { ...s.skillTest!, succeeded: true, modifiedSkill: 8 } }
    s = dispatch(clear(s), { type: 'ApplySkillTestResults' })
    expect(s.pending!.question.choices.some((c) => c.label === 'choice.protectionUse')).toBe(true)
    expect(me(s).discard).not.toContain('08107')
    s = choose(s, 'choice.protectionUse')
    expect(me(s).discard).toContain('08107')
    if (kind === 'fight') expect(s.enemies.foe!.damageTaken).toBe(2)
    else expect(me(s).clues).toBe(2)
  },
)
it('Artistic Inspiration replenishes at most one and spends it after revelation for either adjustment', () => {
  let s = withAsset(patch({ hand: ['01093'] })(start()), '11034', { uses: 0 })
  s = run(s, b('11034').fastOptions!(s, s.assets['11034']!)[0]!.then)
  s = choose(s, 'choice.discard')
  expect(s.assets['11034']).toMatchObject({ uses: 1, exhausted: true })
  expect(me(s).discard).toContain('01093')
  expect(b('11034').fastOptions!(s, s.assets['11034']!)).toEqual([])
  s = begin(s)
  s = { ...s, skillTest: { ...s.skillTest!, revealing: { token: -1, face: -1 } } }
  s = run(
    s,
    b('11034').reactions!(
      s,
      { type: 'afterRevealingChaosToken', investigator: 'a', token: -1 },
      s.assets['11034']!,
    )[0]!.then,
  )
  s = choose(s, 'choice.protectionSkill', { n: -1 })
  expect(s.skillTest!.baseModifier).toBe(-1)
  expect(s.assets['11034']!.uses).toBe(0)
})
it('Dial records its research on the fourth local evade, including automatic evasion', () => {
  let s = withAsset(foe(start()), '11035', { uses: 3 })
  s = run(
    s,
    b('11035').reactions!(
      s,
      { type: 'afterEvade', investigator: 'a', enemy: 'foe' },
      s.assets['11035']!,
    )[0]!.then,
  )
  expect(s.assets['11035']!.uses).toBe(4)
  expect(s.campaignLog!.notes).toContain('calculatedReckoning')
})
it.each(['10042', '10058'])(
  '%s evidence distinguishes successful tests from automatic evasion and exhaustion',
  (code) => {
    let s = withAsset(foe(start()), code, { uses: 2 })
    const t: Trigger = { type: 'afterEvade', investigator: 'a', enemy: 'foe' }
    expect(b(code).reactions!(s, t, s.assets[code]!)).toEqual([])
    s = begin(s)
    s = {
      ...s,
      skillTest: { ...s.skillTest!, kind: { type: 'evade', enemy: 'foe' }, succeeded: true },
    }
    s = run(s, b(code).reactions!(s, t, s.assets[code]!)[0]!.then)
    expect(s.assets[code]!.uses).toBe(3)
    expect(s.assets[code]!.exhausted).toBe(code === '10042')
    expect(
      b(code).reactions!(s, { type: 'enemyDefeated', enemy: s.enemies.foe! }, s.assets[code]!)
        .length,
    ).toBe(code === '10042' ? 0 : 1)
  },
)
it.each([
  ['10042', 2, 3],
  ['10058', 3, 4],
] as const)(
  '%s spends evidence at ST.7 and pays two actions for its investigation',
  (code, spent, total) => {
    let s = withAsset(clues(start()), code, { uses: 4 })
    const o = options(s, code)[0]!
    expect(o.actions).toBe(2)
    s = activate(s, o)
    expect(me(s).actionsRemaining).toBe(1)
    s = choose(s, 'choice.protectionAmount', { n: spent })
    expect(me(s).clues).toBe(total)
    expect(s.assets[code]!.uses).toBe(4 - spent)
  },
)
it('Dissection Tools accumulate evidence without exhausting and apply three distinct thresholds', () => {
  let s = withAsset(foe(start()), '09043')
  for (let n = 1; n <= 3; n++) {
    s = run(
      s,
      b('09043').reactions!(
        s,
        { type: 'enemyDefeated', enemy: s.enemies.foe! },
        s.assets['09043']!,
      )[0]!.then,
    )
    const a = s.assets['09043']!
    s = begin({ ...s, skillTest: null })
    expect(b('09043').skillModifier!(s, a, { ...s.skillTest!, skill: 'agility' })).toBe(1)
    expect(b('09043').skillModifier!(s, a, { ...s.skillTest!, skill: 'combat' })).toBe(
      n >= 2 ? 1 : 0,
    )
    const vitals = b('09043').ownerVitals!
    expect((typeof vitals === 'function' ? vitals(s, a) : vitals).sanity).toBe(n >= 3 ? 1 : 0)
  }
})
it.each([
  [false, 1, true],
  [true, 1, true],
  [true, 0, true],
  [true, 2, false],
] as const)(
  'Lab Coat replaces failure: autoFail %s, difficulty %i',
  (autoFail, difficulty, allowed) => {
    let s = withAsset(withAsset(start(), '09050'), '03192')
    s = begin(s, '03192')
    s = {
      ...s,
      skillTest: { ...s.skillTest!, difficulty, autoFail, baseModifier: -20, tokenModifier: 0 },
    }
    const os = b('09050').reactions!(
      s,
      { type: 'whenWouldFail', investigator: 'a' },
      s.assets['09050']!,
    )
    expect(os.length > 0).toBe(allowed)
    if (allowed) {
      s = run(s, os[0]!.then)
      expect(s.skillTest!.autoFail).toBe(false)
      expect(s.skillTest!.forcedSuccess).toBe(true)
    }
  },
)
it('ordinary forced success still loses to automatic failure without Lab Coat’s explicit replacement', () => {
  let s = begin(start())
  s = { ...s, skillTest: { ...s.skillTest!, autoFail: true } }
  s = dispatch(clear(s), { type: 'ForceSkillTestSuccess' })
  expect(s.skillTest!.autoFail).toBe(true)
})
it('Eldritch Initiation draws for capacity and then discards for filled arcane slots', () => {
  let s = withAsset(
    withAsset(patch({ deck: ['01087', '01093', '01088'] })(start()), '01060'),
    '02147',
  )
  s = run(s, b('09086').play!(s, 'a'))
  s = choose(s, 'choice.discard')
  expect(me(s).hand).toHaveLength(1)
})
it('Eldritch Initiation counts restricted arcane slots as well as ordinary slots', () => {
  let s = withAsset(
    withAsset(patch({ deck: ['01087', '01093', '01088', '01089'] })(start()), '01060'),
    '05112',
  )
  s = run(s, b('09086').play!(s, 'a'))
  s = choose(s, 'choice.discard')
  expect(me(s).hand).toHaveLength(2)
  expect(me(s).deck).toHaveLength(1)
})
it('resource transfer preserves its ordinary local restriction and explicitly validates connecting locations', () => {
  let s = patch({ location: 'B', resources: 5 }, 'b')(start(['a', 'b']))
  s = dispatch(clear(s), { type: 'TransferResources', from: 'b', to: 'a', amount: 2 })
  expect(s.investigators[1]!.resources).toBe(5)
  s = dispatch(clear(s), {
    type: 'TransferResources',
    from: 'b',
    to: 'a',
    amount: 2,
    connecting: true,
  })
  expect(s.investigators[1]!.resources).toBe(3)
  expect(me(s).resources).toBe(22)
  s = patch({ location: 'C' }, 'b')(s)
  s = dispatch(clear(s), {
    type: 'TransferResources',
    from: 'b',
    to: 'a',
    amount: 1,
    connecting: true,
  })
  expect(s.investigators[1]!.resources).toBe(3)
})
it('Elaborate Distraction pays an additional action, covers adjacent enemies and cannot evade Elite', () => {
  let s = foe(foe(patch({ hand: ['10112'] })(start())), 'elite', {
    location: 'B',
    traits: ['Elite'],
  })
  expect(b('10112').additionalPlayActions).toBe(1)
  expect(b('10112').noAttacksOfOpportunity).toBe(true)
  s = dispatch(clear(s), { type: 'PlayCard', investigator: 'a', code: '10112' })
  expect(me(s).actionsRemaining).toBe(2)
  s = choose(s, 'ability.evade')
  s = choose(s, 'choice.protectionEnemy')
  expect(s.enemies.foe!.exhausted).toBe(true)
  expect(s.enemies.elite!.damageTaken).toBe(1)
})
it('I’ll See You in Hell defeats engaged non-Elite enemies and its owner, adding physical trauma', () => {
  let s = foe(foe(foe(start(['a', 'b'])), 'elite', { traits: ['Elite'] }), 'other', {
    engagedWith: 'b',
  })
  s = run(s, b('03189').play!(s, 'a'))
  expect(s.enemies.foe).toBeUndefined()
  expect(s.enemies.elite).toBeDefined()
  expect(s.enemies.other).toBeDefined()
  expect(me(s).eliminated).toBe(true)
  expect(s.campaignLog!.investigators.a?.physicalTrauma).toBe(1)
})
