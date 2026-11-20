// RR: Setup (FAQ 1.26), Search, Face Down, Draw, Costs, Uses, Slots, Bonded, Cancel.
import { expect, it } from 'vitest'
import {
  dispatch,
  createGame,
  playerCardDef,
  playerCardBehavior,
  registerPlayerCards,
  registerPlayerCard,
  registerEnemy,
  registerTreachery,
  playableCards,
  assetSlots,
  availableAbilities,
  type GameState,
  type Message,
  type Trigger,
} from '@lcg/engine'
import { choose, labels, testInvestigator, testScenario, ghoul, spawnAt } from '@lcg/engine/testing'
import { game, patch, withAsset, me } from '../dunwich-pilot/testing'
import { validateDeck, requiredDeckSize, cardPool, investigatorCards } from '../decks'
import { newCampaign, purchaseOptions, purchase } from '../campaign'
import data from '../data/opening-archives.json'
import './index'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const base = () => ({
  ...clear(patch({ hand: [], deck: [], resources: 10 })(game(['a', 'b']))),
  interactive: true,
})
const run = (s: GameState, ...m: Message[]) => dispatch(clear(s), ...m)
const take = (s: GameState, code: string) =>
  choose(s, 'choice.takeCard', { card: playerCardDef(code)!.name })
const behavior = (code: string) => playerCardBehavior(code)!
const effect = (
  s: GameState,
  code: string,
  step: string,
  d: Record<string, string | number | boolean> = {},
) =>
  run(s, { type: 'PlayerCardEffect', investigator: 'a', code, step, data: { asset: code, ...d } })
const options = (s: GameState, code: string) => behavior(code).fastOptions!(s, s.assets[code]!)
const fast = (s: GameState, code: string) => run(s, ...options(s, code)[0]!.then)
const trigger = (s: GameState, code: string, t: Trigger) =>
  run(s, ...behavior(code).reactions!(s, t, s.assets[code]!)[0]!.then)
const withStored = (s: GameState, code: string, cards: string[]) =>
  withAsset(s, code, { storedCards: cards.map((c) => ({ code: c, owner: 'a' })) })
registerPlayerCards([
  {
    code: 'archive-tactic',
    name: 'Tactic',
    type: 'event',
    class: 'guardian',
    cost: 0,
    xp: 0,
    traits: ['Tactic'],
  },
  {
    code: 'archive-tactic-copy',
    name: 'Tactic',
    type: 'event',
    class: 'guardian',
    cost: 0,
    xp: 1,
    traits: ['Tactic'],
  },
  {
    code: 'archive-trick',
    name: 'Trick',
    type: 'event',
    class: 'rogue',
    cost: 0,
    xp: 0,
    traits: ['Trick', 'Illicit'],
  },
  {
    code: 'archive-skill',
    name: 'Skill',
    type: 'skill',
    class: 'neutral',
    xp: 0,
    traits: [],
    icons: { wild: 1 },
  },
  {
    code: 'archive-weak-skill',
    name: 'Weak Skill',
    type: 'skill',
    class: 'neutral',
    xp: 0,
    traits: [],
    weakness: 'basicweakness',
  },
  {
    code: 'archive-tome',
    name: 'Tome',
    type: 'asset',
    class: 'seeker',
    cost: 5,
    xp: 0,
    traits: ['Tome'],
    slots: ['hand', 'hand'],
    uses: { count: 3, type: 'secret' },
  },
  {
    code: 'archive-research',
    name: 'Research',
    type: 'event',
    class: 'seeker',
    cost: 0,
    xp: 0,
    traits: ['Research'],
  },
])
registerPlayerCard({
  code: 'archive-tactic',
  play: (_s, by) => [{ type: 'GainResources', investigator: by, amount: 1 }],
})
registerPlayerCard({
  code: 'archive-research',
  researchEffect: (_s, by) => [{ type: 'GainResources', investigator: by, amount: 2 }],
})
it.each(data)('$code has its own reviewed definition and behavior', (d) => {
  expect(playerCardDef(d.code)).toMatchObject(d)
  expect(behavior(d.code)).toBeTruthy()
})
it('opens setup archives before drawing, without Research reactions, and excludes permanent cards from the deck', () => {
  let s = createGame({
    seed: 2,
    scenario: testScenario(),
    interactive: true,
    investigators: [
      testInvestigator('a', {
        deck: ['03264', 'archive-tactic', 'archive-research', ...Array(10).fill('archive-skill')],
      }),
    ],
  })
  expect(me(s).hand).toEqual([])
  expect(
    s.pending?.question.choices.some((c) => c.params?.card === playerCardDef('03264')!.name),
  ).toBe(true)
  s = choose(s, 'ability.advancedTest', { card: playerCardDef('03264')!.name })
  s = take(s, 'archive-tactic')
  expect(s.pending?.question.choices.some((c) => c.params?.card === 'Tactic')).toBe(false)
  s = choose(s, 'choice.done')
  expect(Object.values(s.assets).find((a) => a.code === '03264')?.storedCards).toEqual([
    { code: 'archive-tactic', owner: 'a' },
  ])
  expect(me(s).resources).toBe(5)
  expect(me(s).hand).toHaveLength(5)
  expect(me(s).deck).not.toContain('03264')
})
it('Stick to the Plan chooses distinct titles and exhausts only when an attached event is played', () => {
  let s = withAsset(
    patch({ deck: ['archive-tactic', 'archive-tactic-copy', 'archive-trick'] })(base()),
    '03264',
  )
  s = effect(s, '03264', 'setup')
  s = take(s, 'archive-tactic')
  expect(s.pending?.question.choices).toHaveLength(1)
  s = choose(s, 'choice.done')
  expect(s.assets['03264']!.exhausted).toBe(false)
  s = run(s, { type: 'PlayCard', investigator: 'a', code: 'archive-tactic' })
  expect(s.assets['03264']!.exhausted).toBe(true)
  expect(me(s).resources).toBe(11)
  expect(me(s).discard).toContain('archive-tactic')
  s = withStored(s, '03264', ['archive-tactic'])
  s.assets['03264']!.exhausted = true
  expect(playableCards(s, 'a', false)).not.toContain('archive-tactic')
  const unchanged = run(s, {
    type: 'PlayCard',
    investigator: 'a',
    code: 'archive-tactic',
    fromStored: { asset: '03264', index: 0 },
  })
  expect(unchanged.assets['03264']!.storedCards).toHaveLength(1)
})
it('Ancestral Knowledge attaches five random nonweak skills, preserves deck order and draws a selected physical skill', () => {
  const deck = [
    'archive-tactic',
    ...Array(7).fill('archive-skill'),
    'archive-weak-skill',
    'archive-trick',
  ]
  let s = withAsset(patch({ deck })(base()), '07303')
  s = trigger(s, '07303', { type: 'beforeOpeningHand', investigator: 'a' })
  expect(s.assets['07303']!.storedCards).toHaveLength(5)
  expect(s.assets['07303']!.storedCards!.every((c) => c.code === 'archive-skill')).toBe(true)
  expect(me(s).deck).toEqual([
    'archive-tactic',
    'archive-skill',
    'archive-skill',
    'archive-weak-skill',
    'archive-trick',
  ])
  s = take(fast(s, '07303'), 'archive-skill')
  expect(me(s).hand).toEqual(['archive-skill'])
  expect(s.assets['07303']!.storedCards).toHaveLength(4)
  expect(options(s, '07303')).toEqual([])
  expect(requiredDeckSize('01002', ['07303'])).toBe(35)
  const checked = validateDeck({
    id: 'x',
    name: 'x',
    investigator: '12004',
    cards: ['07303', ...Array(9).fill('archive-skill')],
  })
  expect(checked.problems.some((p) => p.key === 'deck.problem.ancestralSkills')).toBe(true)
})
it('Market requires ten Illicit cards as a cost and keeps the ordinary deck order', () => {
  let s = withAsset(patch({ deck: Array(9).fill('archive-trick') })(base()), '09077')
  expect(
    behavior('09077').reactions!(
      s,
      { type: 'beforeOpeningHand', investigator: 'a' },
      s.assets['09077']!,
    ),
  ).toEqual([])
  s = patch({ deck: ['archive-tactic', ...Array(10).fill('archive-trick'), 'archive-skill'] })(s)
  s = trigger(s, '09077', { type: 'beforeOpeningHand', investigator: 'a' })
  for (let n = 0; n < 10; n++) s = take(s, 'archive-trick')
  expect(s.assets['09077']!.storedCards).toHaveLength(10)
  expect(me(s).deck).toEqual(['archive-tactic', 'archive-skill'])
  expect(requiredDeckSize('01003', ['09077'])).toBe(40)
})
it('Market reveals only the top two, charges for a real draw and rotates the rest in chosen order', () => {
  let s = withStored(base(), '09077', ['archive-trick', 'archive-tactic', 'archive-skill'])
  s = effect(s, '09077', 'market')
  expect(s.log.filter((x) => x.key === 'log.archiveReveal').map((x) => x.params?.card)).toEqual([
    'Trick',
    'Tactic',
  ])
  s = take(s, 'archive-tactic')
  s = take(s, 'archive-trick')
  expect(me(s).hand).toEqual(['archive-tactic'])
  expect(me(s).resources).toBe(9)
  expect(s.assets['09077']!.storedCards!.map((c) => c.code)).toEqual([
    'archive-skill',
    'archive-trick',
  ])
  s = effect(s, '09077', 'market')
  s = choose(s, 'choice.skip')
  s = take(s, 'archive-trick')
  s = take(s, 'archive-skill')
  expect(s.assets['09077']!.storedCards!.map((c) => c.code)).toEqual([
    'archive-trick',
    'archive-skill',
  ])
  expect(me(s).resources).toBe(9)
})
it('Bewitching draws an attachment or searches the top nine for a copy, allowing Research only in play', () => {
  let s = withStored(
    patch({ deck: ['archive-research', 'archive-trick', 'archive-skill'] })(base()),
    '10079',
    ['archive-trick'],
  )
  s = trigger(s, '10079', { type: 'afterEngage', investigator: 'a', enemy: 'x' })
  s = choose(s, 'ability.searchDeck')
  // Research is an optional reaction in this in-game search.
  expect(s.pending?.question.choices.some((c) => c.params?.card === 'Research')).toBe(true)
  s = choose(s, 'choice.skip')
  s = take(s, 'archive-trick')
  expect(me(s).hand).toContain('archive-trick')
  expect(s.assets['10079']!.storedCards).toHaveLength(1)
  expect(s.assets['10079']!.exhausted).toBe(true)
  s = withStored(base(), '10079', [])
  expect(
    behavior('10079').reactions!(
      s,
      { type: 'afterEngage', investigator: 'a', enemy: 'x' },
      s.assets['10079']!,
    ),
  ).toEqual([])
})
it.each(['11099', '11118'])(
  '%s puts a Tome into play without paying its cost or occupying slots, and returns the physical card',
  (code) => {
    let s = withAsset(
      withAsset(patch({ hand: ['archive-tome'] })(base()), 'archive-tome', { id: 'old' }),
      code,
    )
    s = fast(s, code)
    const tome = Object.values(s.assets).find((a) => a.attachedTo === code)!
    expect(tome).toBeDefined()
    expect(tome.uses).toBe(3)
    expect(assetSlots(tome, s)).toEqual([])
    expect(s.assets.old).toBeDefined()
    expect(me(s).resources).toBe(code === '11099' ? 9 : 10)
    expect(options(s, code)).toEqual([])
    s = run(
      s,
      ...behavior(code).forced!(s, { type: 'turnEnds', investigator: 'a' }, s.assets[code]!),
    )
    if (code === '11118') s = choose(s, 'choice.archiveReturn')
    expect(s.assets[tome.id]).toBeUndefined()
    expect(me(s).deck.at(-1)).toBe('archive-tome')
    expect(me(s).discard).not.toContain('archive-tome')
  },
)
it('Library Pass 5 can pay to retain the same exhausted, damaged Tome and must return it without resources', () => {
  let s = withAsset(withAsset(base(), '11118'), 'archive-tome', {
    attachedTo: '11118',
    uses: 1,
    damage: 1,
    exhausted: true,
  })
  s = run(
    s,
    ...behavior('11118').forced!(s, { type: 'turnEnds', investigator: 'a' }, s.assets['11118']!),
  )
  s = choose(s, 'choice.archivePay')
  expect(s.assets['archive-tome']).toMatchObject({ uses: 1, damage: 1, exhausted: true })
  expect(me(s).resources).toBe(9)
  s = patch({ resources: 0 })(s)
  s = run(
    s,
    ...behavior('11118').forced!(s, { type: 'turnEnds', investigator: 'a' }, s.assets['11118']!),
  )
  expect(me(s).deck.at(-1)).toBe('archive-tome')
})
it.each(['10059', '10060'])('%s searches the shared bonded Growth once per round', (code) => {
  let s = withAsset(patch({ outOfPlay: ['10045'] })(base()), code)
  const ability = availableAbilities(s, 'a').find((o) => o.key.endsWith(':growth'))!
  s = run(s, { ...ability, type: 'UseAbility', investigator: 'a' })
  expect(me(s).hand).toContain('10045')
  s = patch({ outOfPlay: ['10045'], hand: [] })(s)
  expect(availableAbilities(s, 'a').some((o) => o.key === ability.key)).toBe(false)
  s = { ...s, round: s.round + 1 }
  expect(availableAbilities(s, 'a').some((o) => o.key === ability.key)).toBe(true)
})
it('Sentient Myconid cancels another investigator’s entire treachery including Surge and spends all growth', () => {
  const card = {
    kind: 'treachery' as const,
    code: 'archive-treachery',
    name: 'Treachery',
    keywords: ['surge' as const],
  }
  registerTreachery({
    code: card.code,
    revelation: (_s, by) => [{ type: 'TakeDamage', investigator: by, damage: 1, horror: 0 }],
  })
  let s = withAsset(base(), '10059', { uses: 3 })
  s = run(s, { type: 'ResolveEncounterCard', investigator: 'b', card })
  s = choose(s, 'ability.advancedTest', { card: playerCardDef('10059')!.name })
  expect(s.encounterDiscard.map((c) => c.code)).toContain(card.code)
  expect(s.investigators[1]!.damage).toBe(0)
  expect(s.assets['10059']!.uses).toBe(0)
  expect(Object.values(s.enemies)).toHaveLength(0)
})
it('Carnivorous Myconid uses remaining modified health, excludes Elite and immune enemies, and removes all growth', () => {
  let s = withAsset(run(base(), spawnAt('A', ghoul)), '10060', { uses: 1 })
  const enemy = Object.values(s.enemies)[0]!
  expect(enemy).toMatchObject({ maxHealth: 2, damageTaken: 0 })
  expect(options(s, '10060')).toEqual([])
  s = { ...s, enemies: { ...s.enemies, [enemy.id]: { ...enemy, damageTaken: 1 } } }
  s = fast(s, '10060')
  expect(s.enemies[enemy.id]).toBeUndefined()
  expect(s.assets['10060']!.uses).toBe(0)
  s = withAsset(run(base(), spawnAt('A', { ...ghoul, traits: ['Elite'] })), '10060', { uses: 10 })
  expect(options(s, '10060')).toEqual([])
  registerEnemy({ code: 'archive-immune', immuneToPlayerCards: true })
  s = withAsset(run(base(), spawnAt('A', { ...ghoul, code: 'archive-immune' })), '10060', {
    uses: 10,
  })
  expect(options(s, '10060')).toEqual([])
})

it.each(['10059', '10060'])(
  'Uncanny Growth gives its success margin to upgraded %s and returns to bonded cards',
  (code) => {
    let s = withAsset(patch({ hand: ['10045'], deck: ['archive-skill'] })(base()), code)
    const here = me(s).location!
    s = {
      ...s,
      locations: { ...s.locations, [here]: { ...s.locations[here]!, clues: 2 } },
      chaosBag: [2],
    }
    s = run(s, { type: 'PlayCard', investigator: 'a', code: '10045' })
    s = choose(s, 'choice.revealToken')
    while (s.pending && labels(s).includes('choice.applyResults'))
      s = choose(s, 'choice.applyResults')
    expect(s.assets[code]!.uses).toBe(3)
    expect(me(s).outOfPlay).toContain('10045')
    expect(me(s).discard).not.toContain('10045')
  },
)
it('Library Pass cannot be activated outside its controller’s turn and returns cards to their original owner', () => {
  let s = withAsset(patch({ hand: ['archive-tome'] })(base()), '11099')
  expect(options({ ...s, activeTurn: 'b' }, '11099')).toEqual([])
  s = withAsset(s, 'archive-tome', { owner: 'a', originalOwner: 'b', attachedTo: '11099' })
  s = run(s, { type: 'ReturnAssetToDeck', asset: 'archive-tome' })
  expect(s.investigators[1]!.deck.at(-1)).toBe('archive-tome')
  expect(me(s).deck).not.toContain('archive-tome')
})
it('Elli also admits a linked Relic with full slots, and failed unique entry preserves the hand card', () => {
  registerPlayerCards([
    {
      code: 'archive-relic',
      name: 'Relic',
      type: 'asset',
      class: 'seeker',
      xp: 0,
      cost: 1,
      traits: ['Relic'],
      slots: ['hand', 'hand'],
      unique: true,
    },
  ])
  let s = withAsset(withAsset(patch({ hand: ['archive-relic'] })(base()), 'archive-tome'), '04021')
  s = run(s, {
    type: 'PutAssetIntoPlay',
    investigator: 'a',
    code: 'archive-relic',
    fromHand: true,
    attachedTo: '04021',
  })
  expect(Object.values(s.assets).find((a) => a.code === 'archive-relic')?.attachedTo).toBe('04021')
  s = patch({ hand: ['archive-relic'] })(s)
  s = run(s, { type: 'PutAssetIntoPlay', investigator: 'a', code: 'archive-relic', fromHand: true })
  expect(me(s).hand).toContain('archive-relic')
})

it.each(data)(
  '$code is purchasable once, with printed Exceptional cost and Research restrictions',
  (card) => {
    const buyer = investigatorCards().find((i) =>
      cardPool(i.code).some((c) => c.code === card.code),
    )!
    expect(buyer).toBeDefined()
    let c = newCampaign('night-of-the-zealot', ['mateo'], 'standard')
    c = {
      ...c,
      scenarioIndex: 1,
      investigators: [{ ...c.investigators[0]!, id: buyer.code, deck: [] }],
      log: {
        ...c.log,
        investigators: {
          [buyer.code]: { xp: 50, physicalTrauma: 0, mentalTrauma: 0, storyAssets: [] },
        },
      },
    }
    if (card.code === '07303') {
      const skills = cardPool(buyer.code)
        .filter((c) => c.type === 'skill' && c.xp === 0)
        .slice(0, 5)
        .flatMap((c) => [c.code, c.code])
      expect(skills).toHaveLength(10)
      c.investigators[0]!.deck = skills
    }
    const needsResearch = ['10059', '10060'].includes(card.code)
    if (needsResearch) c.investigators[0]!.deck.push('10044')
    if (needsResearch)
      expect(purchaseOptions(c, buyer.code).some((o) => o.code === card.code)).toBe(false)
    c.log.notes.push('classifiedNewSpecies')
    expect(purchaseOptions(c, buyer.code).find((o) => o.code === card.code)?.cost).toBe(
      card.xp * ('exceptional' in card && card.exceptional ? 2 : 1),
    )
    c = purchase(
      c,
      buyer.code,
      card.code,
      needsResearch ? { upgrade: true, replaces: '10044' } : {},
    )
    expect(c.investigators[0]!.deck).toContain(card.code)
    if (needsResearch) expect(c.investigators[0]!.deck).not.toContain('10044')
    expect(
      purchaseOptions(c, buyer.code).filter((o) => o.code === card.code && !o.replaces),
    ).toEqual([])
  },
)
