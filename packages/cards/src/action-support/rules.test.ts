// RR: Triggered Abilities, Activate, Costs, Evade, Uses, Skill Tests ST.1–ST.8.
import { expect, it } from 'vitest'
import {
  availableAbilities,
  dispatch,
  playerCardBehavior,
  playerCardDef,
  registerPlayerCard,
  registerPlayerCards,
  registerTreachery,
  skillTestValue,
  usesLenders,
  type GameState,
  type SkillTestKind,
  type Trigger,
} from '@lcg/engine'
import { choose, ghoul, labels, spawnAt } from '@lcg/engine/testing'
import { game, patch, withAsset, me } from '../dunwich-pilot/testing'
import { cardName } from '../advanced-tests/common'
import data from '../data/action-support.json'
import './index'

const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const base = () => ({
  ...patch({ resources: 10, hand: [] })(clear(game(['a', 'b']))),
  interactive: true,
})
const own = (code: string) => withAsset(base(), code)
const behavior = (code: string) => playerCardBehavior(code)!
const begin = (
  s: GameState,
  kind: SkillTestKind,
  source?: string,
  skill: 'agility' | 'combat' | 'intellect' = 'agility',
) =>
  dispatch(clear(s), {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill,
    difficulty: 2,
    kind,
    ...(source ? { source } : {}),
  })
const react = (s: GameState, code: string) =>
  choose(s, 'ability.advancedTest', { card: cardName(code) })
const reveal = (s: GameState) => choose({ ...s, chaosBag: [0] }, 'choice.revealToken')
const apply = (s: GameState) => choose(s, 'choice.applyResults')
const activate = (s: GameState, code: string, at = 0) =>
  dispatch(clear(s), ...behavior(code).abilities!(s, s.assets[code]!, 'a')[at]!.then)
const trigger = (s: GameState, t: Trigger) => dispatch(clear(s), { type: 'Forced', trigger: t })
const enemy = (s: GameState) => dispatch(s, spawnAt(me(s).location!, { ...ghoul, health: 8 }, 'a'))
const target = (s: GameState) => Object.keys(s.enemies)[0]!

it.each(data)('$code is registered once with its official distinct level', (c) => {
  expect(behavior(c.code)).toBeDefined()
  expect(playerCardDef(c.code)?.xp).toBe(c.xp)
})

it.each(['03028', '52005'])(
  '%s disengages without exhausting and prevents re-engagement only for this turn',
  (code) => {
    let s = enemy(own(code))
    const id = target(s)
    const ability = behavior(code).abilities!(s, s.assets[code]!, 'a')[0]!
    expect(ability.actions).toBe(code === '52005' ? 0 : 1)
    if (code === '52005') {
      expect(behavior(code).fastOptions!(s, s.assets[code]!)).toHaveLength(1)
      expect(behavior(code).fastOptions!({ ...s, activeTurn: null }, s.assets[code]!)).toHaveLength(
        0,
      )
    }
    s = dispatch(s, ...ability.then)
    expect(s.skillTest?.difficulty).toBe(Math.max(0, s.enemies[id]!.evade - 2))
    s = apply(reveal(s))
    expect(s.enemies[id]).toMatchObject({ exhausted: false, engagedWith: null })
    s = dispatch(clear(s), { type: 'CheckEngagement', location: me(s).location! })
    expect(s.enemies[id]!.engagedWith).not.toBe('a')
    s = dispatch(clear({ ...s, round: s.round + 1 }), {
      type: 'EngageEnemy',
      enemy: id,
      investigator: 'a',
    })
    expect(s.enemies[id]!.engagedWith).toBe('a')
  },
)

it('String Along keeps the enemy engaged but exhausted and draws only after success', () => {
  let s = enemy(own('11052'))
  const id = target(s)
  s = begin(s, { type: 'evade', enemy: id })
  s = react(s, '11052')
  expect(s.skillTest?.addedEnemyKeywords).toContain('alert')
  expect(s.skillTest?.baseModifier).toBe(1)
  s = apply(reveal(s))
  expect(s.enemies[id]).toMatchObject({ exhausted: true, engagedWith: 'a' })
  expect(me(s).hand).toHaveLength(1)
})

it('Hatchet Man adds damage to the next damage instance once, rather than another attack', () => {
  let s = enemy(base())
  const id = target(s)
  s = begin(s, { type: 'evade', enemy: id })
  const messages = behavior('04155').afterCommittedTest!(s, s.skillTest!, true, 'a')
  s = dispatch(clear(s), ...messages, { type: 'DamageEnemy', enemy: id, amount: 0, by: 'b' })
  expect(s.enemies[id]!.damageTaken).toBe(0)
  s = dispatch(clear(s), { type: 'DamageEnemy', enemy: id, amount: 2, by: 'b' })
  expect(s.enemies[id]!.damageTaken).toBe(3)
  s = dispatch(clear(s), { type: 'DamageEnemy', enemy: id, amount: 1, by: 'a' })
  expect(s.enemies[id]!.damageTaken).toBe(4)
})

it('Persistence commits from discard and shuffles back, including a failed test', () => {
  let s = patch({ discard: ['10118'] })(base())
  s = begin(
    s,
    { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
    undefined,
    'combat',
  )
  expect(labels(s)).toContain('choice.commitFromDiscard')
  s = choose(s, 'choice.commitFromDiscard', { card: cardName('10118') })
  expect(me(s).discard).not.toContain('10118')
  expect(s.skillTest?.committed[0]).toMatchObject({ code: '10118', fromDiscard: true })
  s = apply(choose({ ...s, chaosBag: ['autoFail'] }, 'choice.revealToken'))
  expect(me(s).deck).toContain('10118')
  expect(me(s).discard).not.toContain('10118')
})

// RR: Delayed Effects; Persistence establishes the shuffle when committed from discard.
it('Persistence still shuffles its returned copy from hand when the test ends', () => {
  let s = patch({ discard: ['10118'] })(base())
  s = begin(
    s,
    { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
    undefined,
    'combat',
  )
  s = choose(s, 'choice.commitFromDiscard', { card: cardName('10118') })
  s = dispatch(
    { ...s, pending: null },
    { type: 'ReturnCommittedCard', index: 0 },
    { type: 'CommitWindow' },
  )
  expect(me(s).hand).toContain('10118')
  s = apply(reveal(s))
  expect(me(s).hand).not.toContain('10118')
  expect(me(s).deck).toContain('10118')
})

// RR: Nested Skill Tests: the new test waits until the current test finishes.
it('Stealth (3) can initiate an evasion during a test, resolving the new test afterwards', () => {
  let s = enemy(own('52005'))
  s = begin(s, { type: 'effect', source: 'outer', onSuccess: [], onFail: [], onFailEach: [] })
  const options = behavior('52005').fastOptions!(s, s.assets['52005']!)
  expect(options).toHaveLength(1)
  s = dispatch({ ...s, pending: null }, ...options[0]!.then, { type: 'CommitWindow' })
  expect(s.skillTest!.kind).toMatchObject({ type: 'effect', source: 'outer' })
  s = apply(reveal(s))
  expect(s.skillTest!.kind).toMatchObject({ type: 'evade', enemy: target(s) })
})

it.each(['11081', '11082', '11084'])(
  '%s can activate from hand by discarding itself instead of exhausting',
  (code) => {
    let s = enemy(patch({ hand: [code, '01088'] })(base()))
    const options = availableAbilities(s, 'a').filter((o) => o.key.startsWith('hand:' + code))
    expect(options.length).toBeGreaterThan(0)
    const option = options[0]!
    s = dispatch(clear(s), {
      type: 'UseAbility',
      investigator: 'a',
      key: option.key,
      actions: option.actions,
      provokes: option.provokes,
      then: option.then,
    })
    expect(me(s).hand).not.toContain(code)
    expect(me(s).discard).toContain(code)
    expect(s.skillTest?.baseModifier).toBe(1)
    s = apply(reveal(s))
    s = choose(s, 'choice.discard', { card: cardName('01088') })
    expect(me(s).hand).not.toContain('01088')
    if (code === '11081') expect(s.enemies[target(s)]?.stayExhausted).toBe(true)
    if (code === '11082') expect(s.enemies[target(s)]?.damageTaken).toBe(2)
    if (code === '11084') expect(me(s).clues).toBe(2)
  },
)

it.each(['11081', '11082', '11084'])(
  '%s may instead exhaust in play and keeps its card after a failed test',
  (code) => {
    let s = enemy(own(code))
    s = activate(s, code)
    expect(s.assets[code]!.exhausted).toBe(true)
    s = apply(choose({ ...s, chaosBag: ['autoFail'] }, 'choice.revealToken'))
    expect(s.assets[code]).toBeDefined()
    expect(labels(s)).not.toContain('choice.discard')
  },
)

it('Enchanted Blade (3) pays a charge only after success and heals/draws only for an empowered defeat', () => {
  let s = enemy(own('05192'))
  const id = target(s)
  s = { ...s, enemies: { ...s.enemies, [id]: { ...s.enemies[id]!, health: 2, maxHealth: 2 } } }
  s = patch({ horror: 2 })(s)
  s = activate(s, '05192')
  expect(s.assets['05192']!.uses).toBe(3)
  s = apply(reveal(s))
  s = choose(s, 'choice.actionSupportEmpower')
  expect(s.assets['05192']!.uses).toBe(2)
  expect(s.enemies[id]).toBeUndefined()
  expect(me(s).horror).toBe(1)
  expect(me(s).hand).toHaveLength(1)
})

it.each(['08104', '08106'])(
  '%s exchanges only the basic clue, retaining additional discoveries',
  (code) => {
    let s = patch({ discard: ['01016'] })(own(code))
    s = begin(
      s,
      { type: 'investigate', location: me(s).location!, extraClues: 1 },
      undefined,
      'intellect',
    )
    s = reveal(s)
    s = react(s, code)
    s = choose(s, 'choice.card', { card: cardName('01016') })
    if (code === '08106' && labels(s).includes('choice.skip')) s = choose(s, 'choice.skip')
    s = apply(s)
    expect(me(s).hand).toContain('01016')
    expect(s.assets[code]!.uses).toBe(2)
    expect(me(s).clues).toBe(code === '08104' ? 1 : 2)
  },
)

it('Jacob Morrison cannot ready in upkeep but readies after a resolved blessing', () => {
  let s = own('07309')
  expect(behavior('07309').noUpkeepReady).toBe(true)
  s = begin(s, { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] })
  s = react(trigger(s, { type: 'whenWouldFail', investigator: 'a' }), '07309')
  expect(s.assets['07309']!.exhausted).toBe(true)
  s = dispatch(clear(s), { type: 'ReadyAll' })
  expect(s.assets['07309']!.exhausted).toBe(true)
  expect(s.skillTest?.baseModifier).toBe(2)
  s = trigger(s, { type: 'afterRevealChaosToken', investigator: 'a', token: 'bless' })
  s = react(s, '07309')
  expect(s.assets['07309']!.exhausted).toBe(false)
})

it('Ariadne lends secrets locally to another controller and moves tokens without gaining resources', () => {
  registerPlayerCards([
    {
      code: 'test-secret',
      name: 'Secret',
      type: 'asset',
      class: 'seeker',
      cost: 0,
      xp: 0,
      traits: [],
      uses: { count: 3, type: 'secret' },
    },
  ])
  let s = withAsset(own('07304'), 'test-secret', { owner: 'b', uses: 0 })
  const deposit = behavior('07304').abilities!(s, s.assets['07304']!, 'a')[0]!
  s = dispatch(s, ...deposit.then)
  expect(s.assets['07304']!.uses).toBe(1)
  expect(me(s).resources).toBe(9)
  expect(usesLenders(s, s.assets['test-secret']!).map((a) => a.code)).toContain('07304')
  s = dispatch(clear(s), { type: 'SpendUses', asset: 'test-secret', amount: 1 })
  expect(s.assets['07304']!.uses).toBe(0)
  expect(s.assets['test-secret']!.uses).toBe(0)
  s = patch({ location: 'elsewhere' }, 'b')(s)
  expect(usesLenders(s, s.assets['test-secret']!)).toHaveLength(0)
})

it('Kerosene requires a defeat at this location this round and heals split horror', () => {
  let s = patch({ horror: 2 })(own('04304'))
  expect(behavior('04304').abilities!(s, s.assets['04304']!, 'a')).toHaveLength(0)
  s = { ...s, enemyDefeats: [{ round: s.round, location: me(s).location! }] }
  s = activate(s, '04304')
  s = choose(s, 'choice.actionSupportHeal', { card: me(s).name })
  s = choose(s, 'choice.actionSupportHeal', { card: me(s).name })
  expect(me(s).horror).toBe(0)
  expect(s.assets['04304']!.uses).toBe(2)
})

it('Sin-Eater moves doom and readies the donor; its action removes all accumulated doom', () => {
  let s = withAsset(own('09094'), '01060', { doom: 2, exhausted: true })
  s = activate(s, '09094')
  s = choose(s, 'choice.actionSupportReady')
  expect(s.assets['01060']).toMatchObject({ doom: 1, exhausted: false })
  expect(s.assets['09094']!.doom).toBe(1)
  const clean = behavior('09094').abilities!(s, s.assets['09094']!, 'a').find((o) =>
    o.key.endsWith(':clean'),
  )!
  s = dispatch(clear(s), ...clean.then)
  expect(s.assets['09094']!.doom).toBe(0)
})

it('Cryptic Grimoire needs ten curses, translates the research and replaces exactly five', () => {
  let s = own('07022')
  expect(behavior('07022').abilities!(s, s.assets['07022']!, 'a')).toHaveLength(1)
  s = activate(s, '07022')
  expect(s.chaosBag).toContain('curse')
  s = { ...s, chaosBag: [...Array.from({ length: 10 }, () => 'curse' as const), 0] }
  s = activate(s, '07022', 0)
  expect(s.assets['07022']).toBeUndefined()
  expect(s.chaosBag.filter((t) => t === 'curse')).toHaveLength(5)
  expect(s.chaosBag.filter((t) => t === 'bless')).toHaveLength(5)
  expect(s.campaignLog?.notes).toContain('translatedGrimoire')
})

it('Purifying Corruption leaves play when its third corruption is placed', () => {
  const code = 'purify-third-test'
  registerTreachery({ code, revelation: () => [] })
  let s = withAsset(base(), '07273', { uses: 2 })
  s = { ...s, encounterDeck: [{ kind: 'treachery', code, name: 'Test treachery', keywords: [] }] }
  s = dispatch(s, { type: 'DrawEncounterCard', investigator: 'a' })
  s = react(s, '07273')
  expect(me(s)).toMatchObject({ damage: 1, horror: 1 })
  expect(s.assets['07273']).toBeUndefined()
})

it('Old Shotgun enters with no ammo normally, but with two while a nested event resolves', () => {
  const initial = behavior('08088').initialUses!
  expect(initial(base(), 'a')).toBe(0)
  expect(initial({ ...base(), eventResolutions: ['test-event'] }, 'a')).toBe(2)
  let s = withAsset(base(), '08088', { uses: 2 })
  s = enemy(s)
  s = activate(s, '08088')
  expect(s.assets['08088']!.uses).toBe(1)
  expect(s.skillTest?.kind).toMatchObject({ damagePerSuccess: { max: 3 }, failDamagePerPoint: 3 })
})

it('Snipe converts physical symbols, including autofail, to zero only for the next firearm fight action', () => {
  let s = withAsset(base(), '01016')
  s = enemy(s)
  s = dispatch(s, ...behavior('08087').play!(s, 'a'))
  s = dispatch(
    clear(s),
    { type: 'BeginAssetAbility', asset: '01016', actions: 1 },
    {
      type: 'BeginSkillTest',
      investigator: 'a',
      source: '01016',
      skill: 'combat',
      difficulty: 1,
      kind: { type: 'fight', enemy: target(s) },
    },
  )
  expect(s.skillTest?.symbolsAsZero).toBe(true)
  s = choose({ ...s, chaosBag: ['autoFail'] }, 'choice.revealToken')
  expect(s.skillTest?.succeeded).toBe(true)
  expect(s.skillTest?.tokens).toEqual([0])
  s = apply(s)
  expect(s.chaosBag).toContain('autoFail')
  expect(me(s).nextFightTokenConversion).toBeUndefined()
})

it('Ghastly Possession adds two wild icons with doom, or replenishes up to the printed uses value', () => {
  let s = withAsset(patch({ hand: ['09090'] })(base()), '01060', { uses: 2 })
  s = begin(
    s,
    { type: 'effect', source: 'asset-test', onSuccess: [], onFail: [], onFailEach: [] },
    '01060',
    'intellect',
  )
  s = choose(s, 'choice.commit', { card: cardName('09090') })
  s = choose(s, 'choice.actionSupportDoom')
  expect(s.assets['01060']!.doom).toBe(1)
  expect(s.skillTest?.committed[0]?.iconBonus?.wild).toBe(2)
  expect(skillTestValue(s).icons).toBe(3)
})

// Official rules response, Ghastly Possession: returning the skill removes its second effect.
it('Ghastly Possession loses its successful-test effect after returning to hand', () => {
  let s = withAsset(patch({ hand: ['09090'] })(base()), '01060', { uses: 3 })
  s = begin(
    s,
    { type: 'effect', source: 'asset-test', onSuccess: [], onFail: [], onFailEach: [] },
    '01060',
    'intellect',
  )
  s = choose(s, 'choice.commit', { card: cardName('09090') })
  s = choose(s, 'choice.actionSupportReplenishLater')
  s = dispatch(
    { ...s, pending: null },
    { type: 'ReturnCommittedCard', index: 0 },
    { type: 'CommitWindow' },
  )
  expect(me(s).hand).toContain('09090')
  expect(skillTestValue(s).icons).toBe(0)
  s = apply(reveal(s))
  expect(labels(s)).not.toContain('choice.actionSupportReplenish')
  expect(s.assets['01060']!.uses).toBe(3)
})

it('Ghastly Possession replenishes on success while the skill remains committed, capped at its uses value', () => {
  let s = withAsset(patch({ hand: ['09090'] })(base()), '01060', { uses: 3 })
  s = begin(
    s,
    { type: 'effect', source: 'asset-test', onSuccess: [], onFail: [], onFailEach: [] },
    '01060',
    'intellect',
  )
  s = choose(s, 'choice.commit', { card: cardName('09090') })
  s = choose(s, 'choice.actionSupportReplenishLater')
  s = apply(reveal(s))
  s = choose(s, 'choice.actionSupportReplenish')
  expect(s.assets['01060']!.uses).toBe(4)
})

it('Webb can recover an Item after successfully investigating a location with no clues', () => {
  let s = patch({ discard: ['01016'] })(own('08104'))
  s = { ...s, locations: { ...s.locations, A: { ...s.locations.A!, clues: 0 } } }
  s = reveal(begin(s, { type: 'investigate', location: 'A' }, undefined, 'intellect'))
  s = react(s, '08104')
  s = choose(s, 'choice.card', { card: cardName('01016') })
  s = apply(s)
  expect(me(s).hand).toContain('01016')
  expect(me(s).clues).toBe(0)
})

it('Ariadne can move a resource to a different controlled asset as a secret', () => {
  let s = withAsset(own('07304'), '01060', { uses: 0 })
  // Shrivelling uses charges, so it must not receive secrets.
  expect(
    behavior('07304').abilities!(s, s.assets['07304']!, 'a').some(
      (o) => o.key === '07304:advanced:deposit:01060',
    ),
  ).toBe(false)
  s = withAsset(s, '04307', { uses: 0 })
  const deposit = behavior('07304').abilities!(s, s.assets['07304']!, 'a').find((o) =>
    o.key.endsWith(':deposit:04307'),
  )
  expect(deposit).toBeDefined()
  s = dispatch(clear(s), ...deposit!.then)
  expect(s.assets['04307']!.uses).toBe(1)
  expect(s.assets['07304']!.uses).toBe(0)
  expect(me(s).resources).toBe(9)
})

it('Stealth applies the zero minimum after combining all enemy evade modifiers', () => {
  let s = enemy(own('03028'))
  const id = target(s)
  s = { ...s, enemies: { ...s.enemies, [id]: { ...s.enemies[id]!, evade: 1 } } }
  s = dispatch(s, {
    type: 'AddEnemyModifier',
    enemy: id,
    modifier: { source: 'test', until: 'round', evade: 2 },
  })
  s = activate(s, '03028')
  expect(s.skillTest!.difficulty).toBe(1)
})

it('Nautical Charts investigates against the modified shroud, including from hand', () => {
  let s = own('11084')
  s = { ...s, locations: { ...s.locations, A: { ...s.locations.A!, shroudModifier: 2 } } }
  expect(activate(s, '11084').skillTest!.difficulty).toBe(4)
  s = patch({ hand: ['11084'] })(base())
  s = { ...s, locations: { ...s.locations, A: { ...s.locations.A!, shroudModifier: 2 } } }
  const option = behavior('11084').handAbilities!(s, 'a')[0]!
  expect(dispatch(s, ...option.then).skillTest!.difficulty).toBe(4)
})

it.each(['08104', '08106'])('%s can redirect a basic clue to a connecting location', (code) => {
  let s = own(code)
  s = { ...s, locations: { ...s.locations, B: { ...s.locations.B!, revealed: true, clues: 2 } } }
  s = reveal(begin(s, { type: 'investigate', location: me(s).location! }, undefined, 'intellect'))
  s = react(s, code)
  s = choose(s, 'choice.location', { location: getLocationName(s, 'B') })
  s = apply(s)
  expect(me(s).clues).toBe(1)
  expect(s.locations.A!.clues).toBe(4)
  expect(s.locations.B!.clues).toBe(1)
})
const getLocationName = (s: GameState, id: string) => s.locations[id]!.name

it('Webb (0) cannot replace a clue from a remote investigation, while Webb (2) may still recover an Item', () => {
  for (const code of ['08104', '08106']) {
    let s = patch({ discard: ['01016'] })(own(code))
    s = { ...s, locations: { ...s.locations, B: { ...s.locations.B!, revealed: true, clues: 2 } } }
    s = begin(s, { type: 'investigate', location: 'B' }, undefined, 'intellect')
    const options = behavior(code).reactions!(
      s,
      {
        type: 'afterSkillTest',
        investigator: 'a',
        kind: 'investigate',
        succeeded: true,
        margin: 1,
        location: 'B',
      },
      s.assets[code]!,
    )
    expect(options.length).toBe(code === '08104' ? 0 : 1)
  }
})

it('Old Shotgun gains its conditional ammo through actual event resolution and the context then ends', () => {
  const code = 'action-support-test-event'
  registerPlayerCards([
    { code, name: 'Play weapon', type: 'event', class: 'guardian', cost: 0, xp: 0, traits: [] },
  ])
  registerPlayerCard({
    code,
    play: (_s, by) => [{ type: 'PlayCard', investigator: by, code: '08088', noCost: true }],
  })
  let s = patch({ hand: [code, '08088'] })(base())
  s = dispatch(s, { type: 'PlayCard', investigator: 'a', code })
  expect(Object.values(s.assets).find((a) => a.code === '08088')?.uses).toBe(2)
  expect(s.eventResolutions).toEqual([])
})

it('Purifying Corruption cancels a real revelation and retains its paid corruption', () => {
  const code = 'action-support-test-treachery'
  registerTreachery({
    code,
    revelation: (_s, by) => [{ type: 'LoseResources', investigator: by, amount: 5 }],
  })
  let s = own('07273')
  s = { ...s, encounterDeck: [{ kind: 'treachery', code, name: 'Test treachery', keywords: [] }] }
  s = dispatch(s, { type: 'DrawEncounterCard', investigator: 'a' })
  s = react(s, '07273')
  expect(me(s).resources).toBe(10)
  expect(me(s)).toMatchObject({ damage: 1, horror: 1 })
  expect(s.assets['07273']!.uses).toBe(1)
  expect(s.encounterDiscard.some((c) => c.code === code)).toBe(true)
})

it('Purifying Corruption chooses its effect after resolving the encounter drawn as its cost', () => {
  const code = 'purify-cost-test'
  registerTreachery({ code, revelation: () => [] })
  let s = patch({ damage: 1 })(own('07273'))
  s = { ...s, encounterDeck: [{ kind: 'treachery', code, name: 'Cost treachery', keywords: [] }] }
  const ability = behavior('07273').abilities!(s, s.assets['07273']!, 'a')[0]!
  s = dispatch(s, ...ability.then)
  s = react(s, '07273')
  expect(s.assets['07273']!.uses).toBe(1)
  expect(labels(s)).toContain('choice.actionSupportCorruption')
  s = choose(s, 'choice.actionSupportCorruption')
  expect(s.assets['07273']!.uses).toBe(0)
})

it('Kerosene observes an actual enemy defeat and its final supply discards the asset before healing', () => {
  let s = enemy(patch({ horror: 1 })(withAsset(base(), '04304', { uses: 1 })))
  s = dispatch(s, { type: 'DefeatEnemy', enemy: target(s), by: 'a' })
  expect(s.enemyDefeats).toContainEqual({ round: s.round, location: me(s).location })
  s = activate(s, '04304')
  expect(s.assets['04304']).toBeUndefined()
  s = choose(s, 'choice.actionSupportHeal', { card: me(s).name })
  expect(me(s).horror).toBe(0)
})

it('Anchor Chain cannot prevent an Elite enemy from readying', () => {
  let s = enemy(patch({ hand: ['01088'] })(own('11081')))
  const id = target(s)
  s = { ...s, enemies: { ...s.enemies, [id]: { ...s.enemies[id]!, traits: ['Elite'] } } }
  s = apply(reveal(activate(s, '11081')))
  expect(labels(s)).not.toContain('choice.discard')
  expect(s.enemies[id]?.stayExhausted).not.toBe(true)
  expect(me(s).hand).toContain('01088')
})
