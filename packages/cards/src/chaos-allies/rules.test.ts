// RR: Bonded, Automatic Success, Chaos Bag, Seal, Replenish, Triggered Abilities, ST.3/ST.8.
import { expect, it } from 'vitest'
import {
  allPlayerCardDefs,
  dispatch,
  getInvestigator,
  playerCardBehavior,
  playerCardDef,
  poolTokensAvailable,
  registerTreachery,
  skillTestValue,
  type AbilityOption,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, ghoul, spawnAt } from '@lcg/engine/testing'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'
import { cardName } from './common'
import { observeDoom } from '../../../engine/src/doom-observation'
import data from '../data/chaos-allies.json'
import './index'

const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const base = () => {
  const s = patch({ hand: [], resources: 20, deck: ['01088', '01089', '01090'], discard: [] })(
    clear(game(['a', 'b'])),
  )
  return {
    ...s,
    interactive: true,
    locations: Object.fromEntries(
      Object.entries(s.locations).map(([id, l]) => [id, { ...l, revealed: true, clues: 3 }]),
    ),
  }
}
const own = (code: string, changes = {}) => withAsset(base(), code, changes)
const b = (code: string) => playerCardBehavior(code)!
const use = (s: GameState, o: AbilityOption) =>
  dispatch(clear(s), {
    type: 'UseAbility',
    investigator: 'a',
    key: o.key,
    actions: o.actions,
    provokes: o.provokes,
    then: o.then,
    ...(o.costs ? { costs: o.costs } : {}),
    ...(o.actionKind ? { actionKind: o.actionKind } : {}),
  })
const play = (s: GameState, code: string) =>
  dispatch(clear(patch({ hand: [...me(s).hand, code] })(s)), {
    type: 'TakeAction',
    investigator: 'a',
    action: { kind: 'play', card: code },
  })
const react = (s: GameState, code: string) =>
  choose(s, 'ability.advancedTest', { card: cardName(code) })
const reveal = (s: GameState, bag: GameState['chaosBag'] = [0]) =>
  choose({ ...s, chaosBag: bag }, 'choice.revealToken')
const results = (s: GameState) => choose(s, 'choice.applyResults')
const enemy = (s: GameState, health = 12) =>
  dispatch(clear(s), spawnAt('A', { ...ghoul, health }, 'a'))
const enemyId = (s: GameState) => Object.keys(s.enemies)[0]!
const test = (
  s: GameState,
  skill: 'willpower' | 'intellect' | 'combat' | 'agility' = 'intellect',
) =>
  dispatch(clear(s), {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill,
    difficulty: 3,
    kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
  })

it.each(data)('$code registers its reviewed behavior and level', (c) => {
  expect(b(c.code)).toBeDefined()
  expect(playerCardDef(c.code)?.xp).toBe(c.xp)
})

it('Doyle picks one bonded cat deterministically, shuffles the others and restores the whole set when she leaves', () => {
  const start = patch({ outOfPlay: ['06031', '06032', '06033'] })(base())
  const a = dispatch(start, { type: 'PutAssetIntoPlay', investigator: 'a', code: '06030' })
  const again = dispatch(start, { type: 'PutAssetIntoPlay', investigator: 'a', code: '06030' })
  expect(a).toEqual(again)
  const cats = Object.values(a.assets).filter((x) => ['06031', '06032', '06033'].includes(x.code))
  expect(cats).toHaveLength(1)
  expect(me(a).deck.filter((c) => ['06031', '06032', '06033'].includes(c))).toHaveLength(2)
  const doyle = Object.values(a.assets).find((x) => x.code === '06030')!
  const s = dispatch(clear(a), { type: 'DiscardAsset', asset: doyle.id })
  expect(Object.values(s.assets).some((x) => ['06031', '06032', '06033'].includes(x.code))).toBe(
    false,
  )
  expect(me(s).outOfPlay?.sort()).toEqual(['06031', '06032', '06033'])
  expect(me(s).deck.some((c) => ['06031', '06032', '06033'].includes(c))).toBe(false)
})

it('Doyle finds a committed cat and a removed cat without creating duplicate set-aside copies', () => {
  let s = withAsset(own('06030'), '06033')
  s = patch({ hand: ['06031'], outOfPlay: ['06032'] })(s)
  s = test(s, 'combat')
  s = dispatch(clear(s), { type: 'CommitCard', investigator: 'a', code: '06031' })
  expect(s.skillTest!.committed).toHaveLength(1)
  s = dispatch(
    clear(s),
    { type: 'RemoveAssetFromGame', asset: '06033' },
    { type: 'DiscardAsset', asset: '06030' },
  )
  expect(s.skillTest!.committed).toHaveLength(0)
  expect(me(s).outOfPlay?.sort()).toEqual(['06031', '06032', '06033'])
})

it.each(['06031', '06032', '06033'])(
  '%s can exhaust for a base-five test or discard for automatic success without revealing',
  (code) => {
    let s = code === '06033' ? own(code) : enemy(own(code))
    const choices = b(code).abilities!(s, s.assets[code]!, 'a')
    expect(choices).toHaveLength(2)
    s = use(s, choices[0]!)
    expect(s.skillTest!.baseSkill).toBe(5)
    expect(s.assets[code]!.exhausted).toBe(true)
    expect(s.skillTest!.autoSucceed).not.toBe(true)
    s = code === '06033' ? own(code) : enemy(own(code))
    s = use(s, b(code).abilities!(s, s.assets[code]!, 'a')[1]!)
    expect(s.skillTest).toMatchObject({ baseSkill: 5, autoSucceed: true, noTokens: true })
    expect(me(s).discard).toContain(code)
    s = results(reveal(s, ['autoFail']))
    expect(s.lastSkillTest!.succeeded).toBe(true)
    expect(s.chaosBag).toEqual(['autoFail'])
  },
)

it('a discarded cat can shuffle itself to play a different cat committed during its test', () => {
  let s = patch({ hand: ['06031'] })(own('06032'))
  s = enemy(s)
  s = use(s, b('06032').abilities!(s, s.assets['06032']!, 'a')[1]!)
  s = choose(s, 'choice.commit', { card: cardName('06031') })
  s = results(reveal(s, ['autoFail']))
  s = choose(s, 'choice.chaosCatsSwap', { card: cardName('06031') })
  expect(me(s).deck).toContain('06032')
  expect(Object.values(s.assets).some((a) => a.code === '06031')).toBe(true)
  expect(me(s).discard).not.toContain('06031')
})

it('a cat entering play discards only the other cats controlled by that investigator', () => {
  const s = dispatch(withAsset(own('06033'), '06031', { id: 'other-cat', owner: 'b' }), {
    type: 'PutAssetIntoPlay',
    investigator: 'a',
    code: '06032',
  })
  expect(s.assets['06033']).toBeUndefined()
  expect(s.assets['other-cat']).toBeDefined()
})

it.each(['asset', 'enemy', 'location', 'agenda', 'investigator'])(
  'Cat Mask replenishes two offerings after doom first reaches an empty %s card',
  (kind) => {
    let s = enemy(own('10084', { uses: 0 }))
    const id = enemyId(s)
    const message: Message =
      kind === 'asset'
        ? { type: 'PlaceDoomOnAsset', asset: '10084', amount: 1 }
        : kind === 'enemy'
          ? { type: 'PlaceDoomOnEnemy', enemy: id, amount: 1 }
          : kind === 'location'
            ? { type: 'PlaceLocationTokens', location: 'A', doom: 1 }
            : kind === 'investigator'
              ? { type: 'PlaceDoomOnInvestigator', investigator: 'a', amount: 1 }
              : { type: 'PlaceDoom', amount: 1 }
    s = dispatch(s, message)
    expect(s.assets['10084']!.uses).toBe(2)
    s = dispatch(clear(s), { type: 'SpendUses', asset: '10084', amount: 1 }, message)
    expect(s.assets['10084']!.uses).toBe(1)
  },
)

it('Cat Mask boosts willpower or combat only once per test', () => {
  let s = test(own('10084'), 'combat')
  const o = b('10084').testOptions!(s, s.skillTest!, s.assets['10084']!)[0]!
  s = dispatch(clear(s), ...o.then)
  expect(s.skillTest!.baseModifier).toBe(2)
  expect(s.assets['10084']!.uses).toBe(1)
  expect(b('10084').testOptions!(s, s.skillTest!, s.assets['10084']!)).toEqual([])
})

it('Mind’s Eye replaces a test before committing and replenishes secrets by discarding a hand copy', () => {
  let s = test(own('06328'))
  s = react(s, '06328')
  expect(s.skillTest!.skill).toBe('willpower')
  expect(s.assets['06328']!.uses).toBe(2)
  s = patch({ hand: ['06328'] })(s)
  s = use(s, b('06328').abilities!(s, s.assets['06328']!, 'a')[0]!)
  expect(s.assets['06328']!.uses).toBe(4)
  expect(me(s).hand).not.toContain('06328')
  expect(playerCardDef('06328')!.slots).toEqual(['arcane', 'arcane'])
})

it('Tristan’s chosen bonuses last across rounds and expire at the start of his controller’s next turn', () => {
  let s = dispatch(own('07194'), {
    type: 'Forced',
    trigger: { type: 'turnBegins', investigator: 'a' },
  })
  s = react(s, '07194')
  s = choose(s, 'skill.willpower')
  s = choose(s, 'skill.combat')
  expect(s.assets['07194']!.form).toBe('willpower,combat')
  const a = s.assets['07194']!
  s = test({ ...s, round: s.round + 1 }, 'willpower')
  expect(b('07194').skillModifier!(s, a, s.skillTest!)).toBe(1)
  s = dispatch(clear(s), { type: 'Forced', trigger: { type: 'turnBegins', investigator: 'a' } })
  expect(s.assets['07194']!.form).toBe('')
})

it('Tristan can be played for free after another investigator reveals three Bless/Curse tokens, including ignored ones', () => {
  let s = patch({ hand: ['07194'], resources: 0 })(base())
  s = dispatch(s, {
    type: 'Forced',
    trigger: {
      type: 'skillTestEnded',
      investigator: 'b',
      kind: 'effect',
      succeeded: true,
      margin: 1,
      tokens: ['bless'],
      revealedTokens: ['bless', 'curse', 'curse'],
    },
  })
  s = choose(s, 'ability.playCard', { card: cardName('07194') })
  expect(Object.values(s.assets).some((a) => a.code === '07194')).toBe(true)
  expect(me(s).resources).toBe(0)
})

it('Broken Diadem counts ignored revealed tokens, swaps at three offerings, then Twilight returns its last used token to the bag and swaps back', () => {
  let s = patch({ outOfPlay: ['10134'] })(own('10133', { uses: 2 }))
  s = dispatch(s, {
    type: 'Forced',
    trigger: {
      type: 'skillTestEnded',
      investigator: 'b',
      kind: 'effect',
      succeeded: true,
      margin: 1,
      tokens: [0],
      revealedTokens: ['bless', 'curse', 0],
    },
  })
  s = react(s, '10133')
  const crown = Object.values(s.assets).find((a) => a.code === '10134')!
  expect(crown.uses).toBe(3)
  expect(me(s).outOfPlay).toContain('10133')
  s = { ...s, assets: { ...s.assets, [crown.id]: { ...crown, uses: 1 } } }
  s = test(s)
  s = reveal(s, ['bless'])
  s = react(s, '10134')
  expect(Object.values(s.assets).some((a) => a.code === '10133' && a.uses === 0)).toBe(true)
  s = results(s)
  expect(s.chaosBag).toEqual(['bless'])
  expect(me(s).outOfPlay).toContain('10134')
})

it.each([
  ['10106', 'bless'],
  ['10107', 'curse'],
] as const)(
  '%s pays its own horror/damage, resolves its reward and is set aside on defeat',
  (code, face) => {
    let s = code === '10107' ? enemy(own(code, { damage: 3 })) : own(code, { horror: 3 })
    const id = enemyId(s)
    s = test(s)
    s = reveal(s, [face])
    s = react(s, code)
    s =
      code === '10106'
        ? choose(s, 'choice.location', { location: s.locations.A!.name })
        : choose(s, 'choice.enemy', { enemy: s.enemies[id]!.name })
    expect(s.assets[code]).toBeUndefined()
    expect(me(s).outOfPlay).toContain(code)
    if (code === '10106') expect(me(s).clues).toBe(1)
    else expect(s.enemies[id]!.damageTaken).toBe(2)
  },
)

it.each(['07191', '07192'])(
  '%s gains a secret for each resolved Curse, not an ignored token or somebody else’s test',
  (code) => {
    let s = test(own(code))
    s = reveal(s, ['curse'])
    s = react({ ...s, chaosBag: [0] }, code)
    expect(s.assets[code]!.uses).toBe(1)
    expect(
      b(code).reactions!(
        s,
        { type: 'afterRevealChaosToken', investigator: 'b', token: 'curse' },
        s.assets[code]!,
      ),
    ).toEqual([])
    expect(b(code).requiredResearch).toBe('translatedGrimoire')
  },
)

it('the Herald Grimoire spends two secrets to play an Insight fast at one less resource', () => {
  let s = patch({ hand: ['01037'], resources: 1 })(own('07191', { uses: 2 }))
  const o = b('07191').fastOptions!(s, s.assets['07191']!).find(
    (o) => o.params?.card === cardName('01037'),
  )!
  expect(o).toBeDefined()
  s = dispatch(s, ...o.then)
  expect(s.assets['07191']!.uses).toBe(0)
  expect(me(s).actionsRemaining).toBe(3)
  expect(me(s).resources).toBe(0)
})

it('the Guardian Grimoire replaces the encounter draw itself without removing the encounter card', () => {
  let s = own('07192', { uses: 5 })
  const deck = s.encounterDeck
  s = dispatch(s, { type: 'DrawEncounterCard', investigator: 'a' })
  s = react(s, '07192')
  expect(s.encounterDeck).toEqual(deck)
  expect(me(s).hand).toHaveLength(1)
  expect(s.assets['07192']!.uses).toBe(0)
})

it('Wicked Athame adds the chosen number of Curses as cost, grants +2 per token and replenishes on defeat', () => {
  let s = enemy(withAsset(own('10092'), '10084', { uses: 0 }), 1)
  s = use(s, b('10092').abilities!(s, s.assets['10092']!, 'a')[2]!)
  expect(s.chaosBag.filter((t) => t === 'curse')).toHaveLength(3)
  s = choose(s, 'choice.enemy', { enemy: s.enemies[enemyId(s)]!.name })
  expect(s.skillTest!.baseModifier).toBe(6)
  s = results(reveal(s))
  s = choose(s, 'choice.chaosReplenish', { card: cardName('10084') })
  expect(s.assets['10084']!.uses).toBe(1)
})

it('Wicked Athame cannot be initiated without an eligible target or enough token-pool capacity', () => {
  let s = own('10092')
  expect(b('10092').abilities!(s, s.assets['10092']!, 'a')).toEqual([])
  s = enemy(s)
  s = { ...s, chaosBag: Array.from({ length: 10 }, () => 'curse' as const) }
  expect(b('10092').abilities!(s, s.assets['10092']!, 'a')).toEqual([])
})

it('Diabolical Luck gets three extra wild icons only when committed through its Curse reaction', () => {
  let s = test(patch({ hand: ['10075'] })(base()))
  s = reveal(s, ['curse'])
  s = choose({ ...s, chaosBag: [0] }, 'choice.chaosLuck')
  expect(s.skillTest!.committed[0]!.iconBonus?.wild).toBe(3)
  expect(skillTestValue(s).icons).toBe(4)
  s = test(patch({ hand: ['10075'] })(base()))
  s = choose(s, 'choice.commit', { card: cardName('10075') })
  expect(s.skillTest!.committed[0]!.iconBonus).toBeUndefined()
  expect(skillTestValue(s).icons).toBe(1)
})

it('Gaze reveals seven distinct physical tokens, ignores their ordinary effects and divides the resulting damage', () => {
  let s = enemy(base())
  s = { ...s, chaosBag: ['curse', 'autoFail', 0, 1, -1, 'bless', 'skull'] }
  s = play(s, '07155')
  expect(s.chaosBag).toHaveLength(7)
  expect(me(s).damage).toBe(0)
  const id = enemyId(s)
  for (let n = 0; n < 3; n++) s = choose(s, 'choice.enemy', { enemy: s.enemies[id]!.name })
  expect(s.enemies[id]!.damageTaken).toBe(3)
  expect(Object.values(s.heldChaosTokens ?? {}).flat()).toEqual([])
})

it.each([
  ['curse', true],
  ['elderSign', false],
  ['bless', false],
  ['autoFail', true],
] as const)(
  'Manipulate Destiny resolves the %s branch and returns every revealed token',
  (face, harm) => {
    let s = enemy(patch({ damage: 3 })(base()))
    s = { ...s, chaosBag: [face] }
    s = play(s, '07162')
    s = harm
      ? choose(s, 'choice.enemy', { enemy: s.enemies[enemyId(s)]!.name })
      : choose(s, 'choice.bonded.healDamage', { card: me(s).name })
    expect(me(s).damage).toBe(harm ? 3 : 1)
    expect(s.enemies[enemyId(s)]!.damageTaken).toBe(harm ? 2 : 0)
    expect(s.chaosBag).toEqual([face])
  },
)

it('Manipulate Destiny does not heal if the bag has no qualifying symbol', () => {
  let s = patch({ damage: 3 })(base())
  s = play({ ...s, chaosBag: [0, 'skull'] }, '07162')
  expect(me(s).damage).toBe(3)
  expect(s.chaosBag).toHaveLength(2)
})

it.each([true, false])(
  'Ward of Radiance cancels a non-weakness treachery only if its five tokens include Bless or elder sign (%s)',
  (success) => {
    registerTreachery({
      code: 'chaos-ward-test',
      revelation: (_s, by) => [{ type: 'TakeDamage', investigator: by, damage: 1, horror: 0 }],
    })
    let s = patch({ hand: ['07031'] })(base())
    s = {
      ...s,
      chaosBag: success ? ['bless', 0, 1, 2, 3] : [0, 1, 2, 3, 4],
      encounterDeck: [{ kind: 'treachery', code: 'chaos-ward-test', name: 'Test', keywords: [] }],
    }
    s = dispatch(s, { type: 'DrawEncounterCard', investigator: 'b' })
    s = choose(s, 'ability.playCard', { card: cardName('07031') })
    expect(getInvestigator(s, 'b').damage).toBe(success ? 0 : 1)
    expect(s.chaosBag).toHaveLength(5)
    expect(s.encounterDiscard.some((c) => c.code === 'chaos-ward-test')).toBe(true)
  },
)

it('Seal of the Elders summons both bonded assets if two of each token were revealed, including ignored tokens', () => {
  let s = patch({ hand: ['10105'], outOfPlay: ['10106', '10107'] })(base())
  s = dispatch(s, {
    type: 'Forced',
    trigger: {
      type: 'skillTestEnded',
      investigator: 'b',
      kind: 'effect',
      succeeded: true,
      margin: 1,
      tokens: [0],
      revealedTokens: ['bless', 'bless', 'curse', 'curse', 0],
    },
  })
  s = choose(s, 'ability.playCard', { card: cardName('10105') })
  expect(
    Object.values(s.assets)
      .map((a) => a.code)
      .sort(),
  ).toEqual(['10106', '10107'])
  expect(me(s).discard).not.toContain('10105')
  expect(me(s).hand).not.toContain('10105')
})

it.each([true, false])(
  'Radiant Smite seals up to three blessings, adds skill/damage and returns tokens to pool only on defeat (%s)',
  (defeat) => {
    let s = enemy(base(), defeat ? 2 : 12)
    s = play({ ...s, chaosBag: ['bless', 'bless', 'bless', 0] }, '07153')
    s = choose(s, 'choice.enemy', { enemy: s.enemies[enemyId(s)]!.name })
    s = choose(s, 'choice.chaosSmiteWillpower', { n: 3 })
    expect(s.sealed?.filter((e) => e.holder?.type === 'event')).toHaveLength(3)
    expect(s.skillTest!.baseModifier).toBe(3)
    s = results(choose(s, 'choice.revealToken'))
    expect(s.chaosBag.filter((t) => t === 'bless')).toHaveLength(defeat ? 0 : 3)
    expect(s.sealed).toHaveLength(0)
    if (!defeat) expect(s.enemies[enemyId(s)]!.damageTaken).toBe(4)
  },
)

it('held tokens remain in play for token-pool capacity and return exactly once', () => {
  let s = { ...base(), chaosBag: ['bless', 'bless', 'bless'] as GameState['chaosBag'] }
  s = dispatch(s, {
    type: 'StoreHeldChaosTokens',
    group: 'test',
    tokens: Array.from({ length: 7 }, () => 'bless' as const),
  })
  expect(poolTokensAvailable(s, 'bless')).toBe(0)
  s = dispatch(
    s,
    { type: 'AddChaosTokens', tokens: ['bless'], scenarioOnly: true },
    { type: 'ReturnHeldChaosTokens', group: 'test' },
    { type: 'ReturnHeldChaosTokens', group: 'test' },
  )
  expect(s.chaosBag).toHaveLength(10)
})

it('Ward of Radiance is unavailable for weaknesses or investigators at other locations', () => {
  const weakness = allPlayerCardDefs().find((c) => c.type === 'treachery' && c.weakness)!
  expect(weakness).toBeDefined()
  const pending: Extract<Message, { type: 'ResolveEncounterCard' }> = {
    type: 'ResolveEncounterCard',
    investigator: 'a',
    card: { kind: 'treachery', code: weakness.code, name: weakness.name, keywords: [] },
    draw: { id: 'ward-test', stage: 'after' },
  }
  let s: GameState = { ...base(), queue: [pending] }
  expect(
    b('07031').handReactions!(s, { type: 'whenEncounterDrawn', draw: 'ward-test' }, 'a'),
  ).toEqual([])
  s = {
    ...s,
    queue: [
      {
        ...pending,
        investigator: 'b',
        card: { kind: 'treachery', code: 'ordinary', name: 'Ordinary', keywords: [] },
      },
    ],
  }
  s = patch({ location: 'C' }, 'b')(s)
  expect(
    b('07031').handReactions!(s, { type: 'whenEncounterDrawn', draw: 'ward-test' }, 'a'),
  ).toEqual([])
})

it('Diabolical Luck can be committed reactively even when playing skill cards is forbidden', () => {
  registerTreachery({
    code: 'chaos-block-play',
    revelation: () => [],
    restricts: { play: ['skill'] },
  })
  let s = patch({ hand: ['10075'] })(base())
  s = {
    ...s,
    treacheries: {
      ...s.treacheries,
      block: {
        kind: 'treachery',
        code: 'chaos-block-play',
        name: 'Block',
        id: 'block',
        keywords: [],
        placement: { type: 'threatArea', investigator: 'a' },
      },
    },
  }
  s = test(s)
  s = reveal(s, ['curse'])
  s = choose({ ...s, chaosBag: [0] }, 'choice.chaosLuck')
  expect(skillTestValue(s).icons).toBe(4)
})

it.each(['10106', '10107'])(
  '%s is set aside instead of returning to hand, shuffling or removal',
  (code) => {
    for (const message of [
      { type: 'ReturnAssetToHand', asset: code },
      { type: 'ShuffleAssetIntoDeck', asset: code },
      { type: 'RemoveAssetFromGame', asset: code },
    ] as Message[]) {
      const s = dispatch(own(code), message)
      expect(me(s).outOfPlay).toContain(code)
      expect(me(s).hand).not.toContain(code)
      expect(me(s).deck).not.toContain(code)
      expect(s.removedBondedCards?.some((c) => c.code === code)).not.toBe(true)
    }
  },
)

it('Ward cannot be played by another investigator against Peril, but its drawer may use it', () => {
  registerTreachery({
    code: 'chaos-peril-test',
    revelation: (_s, by) => [{ type: 'TakeDamage', investigator: by, damage: 1, horror: 0 }],
  })
  let s = patch({ hand: ['07031'] })(base())
  s = {
    ...s,
    chaosBag: ['bless'],
    encounterDeck: [
      { kind: 'treachery', code: 'chaos-peril-test', name: 'Peril', keywords: ['peril'] },
    ],
  }
  const other = dispatch(s, { type: 'DrawEncounterCard', investigator: 'b' })
  expect(me(other).hand).toContain('07031')
  expect(getInvestigator(other, 'b').damage).toBe(1)
  s = dispatch(s, { type: 'DrawEncounterCard', investigator: 'a' })
  s = choose(s, 'ability.playCard', { card: cardName('07031') })
  expect(me(s).damage).toBe(0)
})

it('the Herald Grimoire offers ordinary Insights during a test but cannot initiate a nested action', () => {
  let s = patch({ hand: ['01037', '02023'] })(own('07191', { uses: 2 }))
  expect(b('07191').fastOptions!(s, s.assets['07191']!).map((o) => o.params?.card)).toContain(
    cardName('02023'),
  )
  s = test(s)
  const names = b('07191').fastOptions!(s, s.assets['07191']!).map((o) => o.params?.card)
  expect(names).toContain(cardName('01037'))
  expect(names).not.toContain(cardName('02023'))
})

it('Mind’s Eye uses the current willpower base instead of fixing it to the printed value', () => {
  let s = test(withAsset(own('06328'), '02310', { form: 'willpower' }))
  s = react(s, '06328')
  expect(skillTestValue(s).base).toBe(6)
})

it.each(['asset', 'discard', 'committed'])(
  'Doyle retrieves an actual bonded copy removed from %s without inventing others',
  (zone) => {
    let s = patch({ outOfPlay: ['06032', '06033'] })(own('06030'))
    if (zone === 'asset')
      s = dispatch(withAsset(s, '06031'), { type: 'RemoveAssetFromGame', asset: '06031' })
    else if (zone === 'discard')
      s = dispatch(patch({ discard: ['06031'] })(s), {
        type: 'RemoveCardFromDiscard',
        investigator: 'a',
        code: '06031',
      })
    else {
      s = test(patch({ hand: ['06031'] })(s), 'combat')
      s = dispatch(
        clear(s),
        { type: 'CommitCard', investigator: 'a', code: '06031' },
        { type: 'RemoveCommittedCard', investigator: 'a', code: '06031' },
      )
    }
    expect(s.removedBondedCards).toEqual([{ owner: 'a', code: '06031' }])
    s = dispatch(clear(s), { type: 'DiscardAsset', asset: '06030' })
    expect(me(s).outOfPlay?.sort()).toEqual(['06031', '06032', '06033'])
    expect(s.removedBondedCards).toEqual([])
  },
)

it('Cat Mask also recognizes doom counters on treacheries', () => {
  registerTreachery({ code: 'chaos-doom-card', tokenKind: 'doom', revelation: () => [] })
  let s = own('10084', { uses: 0 })
  s = {
    ...s,
    treacheries: {
      doom: {
        kind: 'treachery',
        code: 'chaos-doom-card',
        id: 'doom',
        name: 'Doom',
        keywords: [],
        placement: { type: 'threatArea', investigator: 'b' },
      },
    },
  }
  s = dispatch(s, { type: 'AddTreacheryTokens', treachery: 'doom', amount: 1 })
  expect(s.assets['10084']!.uses).toBe(2)
  s = dispatch(
    s,
    { type: 'SpendUses', asset: '10084', amount: 1 },
    { type: 'AddTreacheryTokens', treachery: 'doom', amount: 1 },
  )
  expect(s.assets['10084']!.uses).toBe(1)
})

it('Cat Mask recognizes doom placed on an unowned story asset by a scenario effect', () => {
  const before: GameState = {
    ...own('10084', { uses: 0 }),
    placedAssets: {
      story: {
        id: 'story',
        code: 'story',
        name: 'Story',
        placement: { type: 'location', location: 'A' },
        exhausted: false,
        damage: 0,
        horror: 0,
      },
    },
  }
  const after: GameState = {
    ...before,
    placedAssets: { story: { ...before.placedAssets!.story!, doom: 1 } },
  }
  const s = dispatch(observeDoom(before, after))
  expect(s.assets['10084']!.uses).toBe(2)
})

it('the Herald respects existing discard permissions without granting arbitrary discard plays', () => {
  let s = patch({ hand: ['01037'], discard: ['01037'], resources: 1 })(own('07191', { uses: 2 }))
  expect(b('07191').fastOptions!(s, s.assets['07191']!)).toHaveLength(1)
  s = withAsset(s, '01014')
  const options = b('07191').fastOptions!(s, s.assets['07191']!)
  expect(options).toHaveLength(2)
  expect(options.map((o) => o.label)).toContain('choice.chaosInsightDiscard')
  s = dispatch(s, ...options.find((o) => o.label === 'choice.chaosInsightDiscard')!.then)
  expect(me(s).hand).toEqual(['01037'])
  expect(me(s).deck.at(-1)).toBe('01037')
  expect(me(s).clues).toBe(1)
})

it('two Herald Grimoires stack their discounts while each copy pays its secrets only once', () => {
  let s = patch({ hand: ['01037'], resources: 0 })(
    withAsset(own('07191', { uses: 4 }), '07191', { id: 'second-grimoire', uses: 2 }),
  )
  const first = b('07191').fastOptions!(s, s.assets['07191']!)[0]!
  expect(first).toBeDefined()
  s = dispatch(s, ...first.then)
  s = choose(s, 'choice.playEconomyModifier', { asset: cardName('07191'), discount: 1, bonus: 0 })
  expect(s.assets['07191']!.uses).toBe(2)
  expect(s.assets['second-grimoire']!.uses).toBe(0)
  expect(me(s).clues).toBe(1)
  expect(me(s).actionsRemaining).toBe(3)
})

it('separate hand copies of Diabolical Luck may both react to the same Curse', () => {
  let s = test(patch({ hand: ['10075', '10075'] })(base()))
  s = reveal(s, ['curse'])
  s = choose({ ...s, chaosBag: [0] }, 'choice.chaosLuck')
  s = choose(s, 'choice.chaosLuck')
  expect(s.skillTest!.committed).toHaveLength(2)
  expect(skillTestValue(s).icons).toBe(8)
})
