// RR: Drawing Cards, Revelation, Cancel, Surge, Search, Uses, Heal, Campaign Play.
import { expect, it, vi } from 'vitest'
import {
  dispatch,
  createGame,
  playerCardDef,
  playerCardBehavior,
  registerPlayerCards,
  registerPlayerCard,
  registerTreachery,
  registerInvestigator,
  skillTestValue,
  type GameState,
  type Message,
  type Trigger,
  type TreacheryCard,
} from '@lcg/engine'
import { choose, labels, spawnAt, ghoul, testInvestigator, testScenario } from '@lcg/engine/testing'
import { game, patch, withAsset, me } from '../dunwich-pilot/testing'
import { cardPool, investigatorCards } from '../decks'
import { newCampaign, purchaseOptions } from '../campaign'
import data from '../data/field-support.json'
import './index'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const run = (s: GameState, ...m: Message[]) => dispatch(clear(s), ...m)
const base = () => ({
  ...clear(
    patch({ hand: [], deck: ['field-normal', 'field-normal'], resources: 20 })(game(['a', 'b'])),
  ),
  interactive: true,
})
const b = (c: string) => playerCardBehavior(c)!
const react = (s: GameState, c: string) =>
  choose(s, 'ability.advancedTest', { card: playerCardDef(c)!.name })
const use = (s: GameState, c: string) => {
  const a = s.assets[c]!,
    o = b(c).abilities!(s, a, 'a')[0]!
  expect(o).toBeDefined()
  return run(s, { ...o, type: 'UseAbility', investigator: 'a' })
}
const effect = (
  s: GameState,
  c: string,
  step: string,
  d: Record<string, string | number | boolean>,
) => run(s, { type: 'PlayerCardEffect', code: c, investigator: 'a', step, data: d })
registerPlayerCards([
  {
    code: 'field-normal',
    name: 'Normal',
    type: 'event',
    class: 'neutral',
    cost: 0,
    xp: 0,
    traits: [],
  },
  {
    code: 'field-dilemma',
    name: 'Dilemma',
    type: 'event',
    class: 'survivor',
    cost: 0,
    xp: 0,
    traits: [],
  },
  {
    code: 'field-weak',
    name: 'Weakness',
    type: 'treachery',
    class: 'neutral',
    xp: 0,
    traits: [],
    weakness: 'basicweakness',
  },
  {
    code: 'field-ally',
    name: 'Ally',
    type: 'asset',
    class: 'neutral',
    cost: 0,
    xp: 0,
    traits: ['Ally'],
    health: 3,
    sanity: 3,
  },
])
const revelation = vi.fn((_s: GameState, by: string): Message[] => [
  { type: 'GainResources', investigator: by, amount: 7 },
])
registerPlayerCard({ code: 'field-dilemma', revelation })
registerTreachery({
  code: 'field-weak',
  revelation: (_s, by) => [{ type: 'LoseResources', investigator: by, amount: 2 }],
})
const treachery: TreacheryCard = {
  kind: 'treachery' as const,
  code: 'field-encounter',
  name: 'Encounter',
  keywords: [],
}
registerTreachery({
  code: treachery.code,
  revelation: (_s, by) => [{ type: 'LoseResources', investigator: by, amount: 2 }],
})
const drawEncounter = (s: GameState, card = treachery, by = 'a') =>
  run(s, { type: 'ResolveEncounterCard', investigator: by, card, fromEncounterDeck: true })
const test = (s: GameState, extra: Partial<Extract<Message, { type: 'BeginSkillTest' }>> = {}) =>
  run(s, {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'intellect',
    difficulty: 2,
    kind: { type: 'investigate', location: 'A' },
    ...extra,
  })
const finish = (s: GameState) => {
  s = choose({ ...s, chaosBag: [0] }, 'choice.revealToken')
  while (s.pending && labels(s).includes('choice.applyResults'))
    s = choose(s, 'choice.applyResults')
  return s
}
it.each(data)(
  '$code preserves its reviewed definition and is available once in its eligible pool',
  (c) => {
    expect(playerCardDef(c.code)).toMatchObject(c)
    expect(b(c.code)).toBeTruthy()
    const buyers = investigatorCards().filter((i) =>
      cardPool(i.code).some((x) => x.code === c.code),
    )
    expect(buyers.length).toBeGreaterThan(0)
    expect(cardPool(buyers[0]!.code).filter((x) => x.code === c.code)).toHaveLength(1)
    const campaign = newCampaign('night-of-the-zealot', ['mateo'], 'standard')
    const buyer = buyers[0]!.code
    campaign.scenarioIndex = 1
    campaign.investigators = [{ ...campaign.investigators[0]!, id: buyer, deck: [] }]
    campaign.log.investigators[buyer] = {
      xp: 50,
      physicalTrauma: 0,
      mentalTrauma: 0,
      storyAssets: [],
    }
    expect(purchaseOptions(campaign, buyer).filter((o) => o.code === c.code)).toHaveLength(1)
  },
)
it('Katja replaces a top-deck Dilemma before revelation and resolves it only when retrieved', () => {
  revelation.mockClear()
  let s = withAsset(patch({ deck: ['field-dilemma', 'field-normal'] })(base()), '09114')
  s = run(s, { type: 'DrawCards', investigator: 'a', amount: 1 })
  s = react(s, '09114')
  expect(revelation).not.toHaveBeenCalled()
  expect(me(s).hand).toEqual(['field-normal'])
  expect(s.assets['09114']!.storedCards).toEqual([{ code: 'field-dilemma', owner: 'a' }])
  s = choose(use(s, '09114'), 'choice.takeCard', { card: 'Dilemma' })
  expect(revelation).toHaveBeenCalledTimes(1)
  expect(me(s).resources).toBe(27)
  expect(me(s).discard).toContain('field-dilemma')
})
it('Katja cannot store weaknesses, non-top draws or a sixth card, and discards stored cards when she leaves', () => {
  let s = withAsset(base(), '09114', {
    storedCards: Array(5).fill({ code: 'field-normal', owner: 'a' }),
  })
  const trigger: Trigger = {
    type: 'whenPlayerCardDrawn',
    investigator: 'a',
    card: 'field-normal',
    fromDeck: true,
  }
  expect(b('09114').reactions!(s, trigger, s.assets['09114']!)).toEqual([])
  s = withAsset(s, '09114')
  expect(b('09114').reactions!(s, { ...trigger, fromDeck: false }, s.assets['09114']!)).toEqual([])
  expect(b('09114').reactions!(s, { ...trigger, card: 'field-weak' }, s.assets['09114']!)).toEqual(
    [],
  )
  s = withAsset(s, '09114', { storedCards: [{ code: 'field-normal', owner: 'a' }] })
  s = run(s, { type: 'DiscardAsset', asset: '09114' })
  expect(me(s).discard).toContain('field-normal')
})
it('Ikiaq cancels another investigator’s basic weakness, adjusts both skills and makes its owner draw it on departure', () => {
  let s = withAsset(patch({ deck: ['field-weak'] }, 'b')(base()), '07267')
  s = run(s, { type: 'DrawCards', investigator: 'b', amount: 1 })
  s = react(s, '07267')
  expect(s.investigators[1]!.resources).toBe(5)
  expect(s.assets['07267']!.storedCards).toEqual([{ code: 'field-weak', owner: 'b' }])
  s = test(s, { skill: 'willpower' })
  expect(skillTestValue(s).base).toBe(3)
  s = run(s, { type: 'ReturnAssetToHand', asset: '07267' })
  expect(s.investigators[1]!.resources).toBe(3)
  expect(s.investigators[1]!.discard).toContain('field-weak')
})
it('Martyr’s Vambrace redirects a local encounter and grants its revelation bonus, excluding Peril and remote draws', () => {
  let s = withAsset(base(), '09037')
  s = drawEncounter(s, treachery, 'b')
  s = react(s, '09037')
  expect(me(s).resources).toBe(18)
  expect(s.investigators[1]!.resources).toBe(5)
  expect(s.assets['09037']!.exhausted).toBe(true)
  const draw: Extract<Message, { type: 'ResolveEncounterCard' }> = {
    type: 'ResolveEncounterCard',
    investigator: 'b',
    card: { ...treachery, keywords: ['peril'] },
    draw: { id: 'x', stage: 'resolve' },
  }
  s = { ...clear(withAsset(base(), '09037')), queue: [draw] }
  expect(
    b('09037').reactions!(s, { type: 'afterEncounterDrawn', draw: 'x' }, s.assets['09037']!),
  ).toEqual([])
})
it.each([false, true])(
  'Maleson lets the drawer keep either drawn encounter (%s) and cancels all effects of the other',
  (second) => {
    const bad = { ...treachery, code: 'field-surge', name: 'Surge', keywords: ['surge' as const] }
    registerTreachery({
      code: bad.code,
      revelation: (_s, by) => [{ type: 'LoseResources', investigator: by, amount: 3 }],
    })
    let s = withAsset(patch({ clues: 1 })(base()), '09054')
    s = { ...s, encounterDeck: [bad, { ...ghoul, code: 'field-extra-enemy' }] }
    s = drawEncounter(s, treachery, 'b')
    s = react(s, '09054')
    expect(s.pending?.investigator).toBe('b')
    s = choose(s, 'choice.card', { card: second ? 'Surge' : 'Encounter' })
    expect(s.assets['09054']!.exhausted).toBe(true)
    expect(me(s).clues).toBe(0)
    expect(s.locations.A!.clues).toBeGreaterThan(0)
    expect(s.investigators[1]!.resources).toBe(second ? 2 : 3)
    expect(Object.values(s.enemies)).toHaveLength(second ? 1 : 0)
    expect(s.encounterDiscard.filter((c) => c.kind === 'treachery')).toHaveLength(2)
  },
)
it.each([false, true])(
  'Counterespionage preserves Surge while cancelling only revelation; personal draw %s',
  (personal) => {
    const surge = { ...treachery, keywords: ['surge' as const] }
    let s = patch({ hand: ['08049'], deck: ['field-normal'] })(base())
    s = { ...s, encounterDeck: personal ? [{ ...ghoul }] : [treachery, { ...ghoul }] }
    s = drawEncounter(s, surge)
    s = choose(s, personal ? 'choice.fieldCounterPlayer' : 'choice.fieldCounterEncounter', {
      n: personal ? 2 : 0,
    })
    expect(me(s).hand).toEqual(personal ? ['field-normal'] : [])
    expect(me(s).resources).toBe(personal ? 16 : 16)
    expect(Object.values(s.enemies)).toHaveLength(1)
  },
)
it('Stylish Coat triggers on another player-card gain during its turn, excluding basic gains and its own effect', () => {
  let s = withAsset(patch({ hand: ['field-normal'] })(base()), '09071')
  registerPlayerCard({
    code: 'field-normal',
    play: (_s, by) => [{ type: 'GainResources', investigator: by, amount: 3 }],
  })
  s = run(s, { type: 'PlayCard', investigator: 'a', code: 'field-normal' })
  s = react(s, '09071')
  expect(me(s).resources).toBe(24)
  expect(s.assets['09071']!.exhausted).toBe(true)
  s = withAsset(base(), '09071')
  s = run(s, { type: 'GainResources', investigator: 'a', amount: 1, basic: true })
  expect(s.assets['09071']!.exhausted).toBe(false)
  expect(me(s).resources).toBe(21)
})
it('Otherworld Codex discards an in-play copy and returns all nine searched cards before shuffling', () => {
  let s = withAsset(run(base(), spawnAt('A', ghoul)), '06158')
  s = { ...s, encounterDeck: [ghoul, ...Array(8).fill(treachery)] }
  const option = b('06158').abilities!(s, s.assets['06158']!, 'a')[0]!
  s = run(s, { ...option, type: 'UseAbility', investigator: 'a' })
  s = choose(s, 'choice.card', { card: ghoul.name })
  expect(Object.values(s.enemies)).toHaveLength(0)
  expect(s.encounterDeck).toHaveLength(9)
  expect(s.encounterDiscard.filter((c) => c.code === ghoul.code)).toHaveLength(1)
  expect(s.assets['06158']).toMatchObject({ exhausted: true, uses: 2 })
})
it('Survival Technique retrieves a controlled location attachment and gives +2 to a location test', () => {
  let s = withAsset(base(), '10123')
  s = {
    ...s,
    locationAttachments: {
      attached: {
        id: 'attached',
        owner: 'a',
        code: 'field-normal',
        location: 'A',
        exhausted: false,
      },
    },
  }
  s = run(s, ...b('10123').fastOptions!(s, s.assets['10123']!)[0]!.then)
  expect(me(s).hand).toContain('field-normal')
  expect(s.locationAttachments?.attached).toBeUndefined()
  s = withAsset(base(), '10123')
  s = test(s)
  s = run(s, ...b('10123').testOptions!(s, s.skillTest!, s.assets['10123']!)[0]!.then)
  expect(skillTestValue(s).total).toBe(5)
})
it('Dreams of the Clay enters play after a successful committed treachery test and cancels a non-Peril revelation', () => {
  let s = patch({ hand: ['11100'] })(base())
  s = { ...s, treacheries: { test: { ...treachery, id: 'test', placement: { type: 'limbo' } } } }
  s = test(s, {
    kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
  })
  s = choose(s, 'choice.commit', { card: playerCardDef('11100')!.name })
  s = finish(s)
  const clay = Object.values(s.assets).find((a) => a.code === '11100')!
  expect(clay).toBeDefined()
  expect(me(s).discard).not.toContain('11100')
  s = drawEncounter(s)
  s = react(s, '11100')
  expect(s.assets[clay.id]).toBeUndefined()
  expect(me(s).resources).toBe(20)
  expect(s.encounterDiscard.map((c) => c.code)).toContain(treachery.code)
})
it.each([9, 10])(
  'Unscrupulous Loan gains ten on play, cannot be returned, and checks its balance %i at game end',
  (resources) => {
    let s = patch({ hand: ['08113'] })(base())
    s = run(s, { type: 'PlayCard', investigator: 'a', code: '08113' })
    s = react(s, '08113')
    expect(me(s).resources).toBe(30)
    const a = Object.values(s.assets).find((a) => a.code === '08113')!
    s = run(s, { type: 'ReturnAssetToHand', asset: a.id })
    expect(s.assets[a.id]).toBeDefined()
    s = patch({ resources })(s)
    s = run(s, { type: 'EndScenario', outcome: { type: 'noResolution' } })
    expect(s.exiled?.some((c) => c.code === '08113') ?? false).toBe(resources < 10)
  },
)
it('Embezzled Treasure moves rather than spends resources, caps at ten, and carries assigned bonuses into only the next setup', () => {
  let s = withAsset(base(), '09063', { uses: 8 })
  s = run(s, ...b('09063').fastOptions!(s, s.assets['09063']!)[1]!.then)
  expect(me(s).resources).toBe(18)
  expect(s.assets['09063']!.uses).toBe(10)
  expect(s.log.some((l) => l.key === 'log.spendResources')).toBe(false)
  s = effect(s, '09063', 'treasure', { left: 2 })
  s = choose(s, 'choice.investigator', { name: 'A' })
  s = choose(s, 'choice.investigator', { name: 'B' })
  expect(s.campaignLog?.values['treasureResources:a']).toBe('1')
  const next = createGame({
    seed: 2,
    scenario: testScenario(),
    campaignLog: s.campaignLog!,
    investigators: [testInvestigator('a')],
  })
  expect(me(next).resources).toBe(6)
  expect(next.campaignLog?.values['treasureResources:a']).toBe('0')
  expect(b('09063').whenGameEndsInPlay!(s, s.assets['09063']!, 'elimination')).toEqual([])
})
it('Absolution reveals a held group once, returns it, adds blessings and heals local horror for revealed blessings', () => {
  let s = patch({ hand: ['10024'], horror: 2 })(base())
  s = { ...s, chaosBag: [0, 1, 'bless'] }
  s = run(s, { type: 'PlayCard', investigator: 'a', code: '10024', x: 0 })
  s = choose(s, 'choice.bonded.healHorror', { card: 'A' })
  expect(me(s).horror).toBe(1)
  expect(s.chaosBag.filter((t) => t === 'bless')).toHaveLength(3)
  expect(s.chaosBag).toHaveLength(5)
  expect(Object.values(s.heldChaosTokens ?? {}).flat()).toEqual([])
})

it('Ikiaq only captures local basic weaknesses and draws the stored card again after removal', () => {
  let s = withAsset(patch({ location: 'B' }, 'b')(base()), '07267')
  expect(
    b('07267').reactions!(
      s,
      { type: 'whenPlayerCardDrawn', investigator: 'b', card: 'field-weak', fromDeck: true },
      s.assets['07267']!,
    ),
  ).toEqual([])
  expect(
    b('07267').reactions!(
      s,
      { type: 'whenPlayerCardDrawn', investigator: 'a', card: 'field-normal', fromDeck: true },
      s.assets['07267']!,
    ),
  ).toEqual([])
  s = withAsset(base(), '07267', { storedCards: [{ code: 'field-weak', owner: 'a' }] })
  s = run(s, { type: 'RemoveAssetFromGame', asset: '07267' })
  expect(me(s).resources).toBe(18)
  expect(me(s).discard).toContain('field-weak')
})
it('Dreams of the Clay excludes Peril and ordinary location tests', () => {
  let s = withAsset(base(), '11100')
  s = {
    ...s,
    treacheries: {
      peril: { ...treachery, id: 'peril', keywords: ['peril'], placement: { type: 'limbo' } },
    },
  }
  expect(
    b('11100').reactions!(
      s,
      { type: 'whenTreacheryDrawn', investigator: 'a', treachery: 'peril' },
      s.assets['11100']!,
    ),
  ).toEqual([])
  s = test(s)
  expect(b('11100').canCommit!(s, s.skillTest!, 'a', 'hand')).toBe(false)
})
it('Loan exiles on elimination below ten; Treasure distributes only when resigning, without paying twice at game end', () => {
  let s = withAsset(patch({ resources: 9 })(base()), '08113')
  s = run(s, { type: 'EliminateInvestigator', investigator: 'a' })
  expect(s.exiled).toContainEqual({ investigator: 'a', code: '08113' })
  s = withAsset(base(), '09063', { uses: 5 })
  s = run(s, { type: 'Resign', investigator: 'a' })
  s = choose(s, 'choice.investigator', { name: 'B' })
  s = choose(s, 'choice.investigator', { name: 'B' })
  expect(s.campaignLog?.values['treasureResources:b']).toBe('2')
  s = run(s, { type: 'EndScenario', outcome: { type: 'noResolution' } })
  expect(s.campaignLog?.values['treasureResources:b']).toBe('2')
})
it('Absolution pays X and respects the ten-blessing pool limit while healing an Ally', () => {
  let s = withAsset(patch({ hand: ['10024'] })(base()), 'field-ally', { horror: 2 })
  s = { ...s, chaosBag: [0, 1, ...Array(9).fill('bless' as const)] }
  s = run(s, { type: 'PlayCard', investigator: 'a', code: '10024', x: 8 })
  s = choose(s, 'choice.bonded.healHorror', { card: 'Ally' })
  s = choose(s, 'choice.bonded.healHorror', { card: 'Ally' })
  expect(me(s).resources).toBe(12)
  expect(s.assets['field-ally']!.horror).toBe(0)
  expect(s.chaosBag.filter((t) => t === 'bless')).toHaveLength(10)
})

it('two Stylish Coats can each react once to another copy’s gain, without a loop', () => {
  let s = withAsset(withAsset(base(), '09071', { id: 'coat-one' }), '09071', { id: 'coat-two' })
  s = run(s, { type: 'GainResources', investigator: 'a', amount: 1, effectSource: 'field-normal' })
  s = react(s, '09071')
  s = react(s, '09071')
  expect(me(s).resources).toBe(23)
  expect(s.assets['coat-one']!.exhausted).toBe(true)
  expect(s.assets['coat-two']!.exhausted).toBe(true)
})
it('Ikiaq’s captured weakness must be drawn on departure even when Ikiaq’s text is blank', () => {
  registerTreachery({ code: 'field-blank', revelation: () => [], blanksAssetTrait: 'Ally' })
  let s = withAsset(base(), '07267', { storedCards: [{ code: 'field-weak', owner: 'a' }] })
  s = {
    ...s,
    treacheries: {
      blank: {
        ...treachery,
        code: 'field-blank',
        id: 'blank',
        placement: { type: 'threatArea', investigator: 'a' },
      },
    },
  }
  s = run(s, { type: 'DiscardAsset', asset: '07267' })
  expect(me(s).resources).toBe(18)
})

it('Stylish Coat recognizes resource gains from its investigator’s elder sign as another player-card effect', () => {
  registerPlayerCards([
    { code: 'a', name: 'A', type: 'investigator', class: 'neutral', traits: [], xp: 0 },
  ])
  registerInvestigator({
    code: 'a',
    elderSign: (_s, self) => ({
      modifier: 0,
      after: [{ type: 'GainResources', investigator: self.id, amount: 1 }],
    }),
  })
  let s = withAsset(base(), '09071')
  s = test(s)
  s = choose({ ...s, chaosBag: ['elderSign'] }, 'choice.revealToken')
  while (s.pending && labels(s).includes('choice.applyResults'))
    s = choose(s, 'choice.applyResults')
  s = react(s, '09071')
  expect(me(s).resources).toBe(22)
})

it('Ikiaq can intercept a basic weakness during All In without duplicating it in the protected shuffle', () => {
  let s = withAsset(patch({ deck: ['field-weak', 'field-normal'] })(base()), '07267')
  s = run(s, { type: 'DrawCards', investigator: 'a', amount: 2, shuffleWeaknesses: true })
  s = react(s, '07267')
  expect(s.assets['07267']!.storedCards).toEqual([{ code: 'field-weak', owner: 'a' }])
  expect(me(s).deck).not.toContain('field-weak')
  expect(me(s).hand).toEqual(['field-normal'])
  expect(me(s).resources).toBe(20)
})
it('Codex discards a physical encounter location with its enemies and defeats investigators remaining there', () => {
  const card = {
    kind: 'location' as const,
    code: 'field-place',
    name: 'Other Place',
    keywords: [],
    shroud: 2,
    clueValue: 0,
    cluesPerInvestigator: false,
    connections: ['A'],
  }
  let s = withAsset(patch({ location: 'field-place' }, 'b')(base()), '06158')
  s = {
    ...s,
    locations: {
      ...s.locations,
      'field-place': { ...s.locations.A!, id: 'field-place', name: card.name, encounterCard: card },
    },
    encounterDeck: [card],
  }
  s = run(s, spawnAt('field-place', ghoul))
  const ability = b('06158').abilities!(s, s.assets['06158']!, 'a')[0]!
  s = run(s, { ...ability, type: 'UseAbility', investigator: 'a' })
  s = choose(s, 'choice.card', { card: card.name })
  expect(s.locations['field-place']).toBeUndefined()
  expect(s.investigators[1]!.eliminated).toBe(true)
  expect(Object.values(s.enemies)).toHaveLength(0)
  expect(s.encounterDiscard.map((c) => c.code)).toContain(card.code)
  expect(s.encounterDeck.map((c) => c.code)).toContain(card.code)
})

it('a borrowed Dreams of the Clay enters the committer’s play area and returns to its original owner', () => {
  let s = base()
  s = { ...s, treacheries: { test: { ...treachery, id: 'test', placement: { type: 'limbo' } } } }
  s = test(s, {
    kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
  })
  // RR Ownership: a card committed by an effect may belong to another investigator.
  s = { ...s, skillTest: { ...s.skillTest!, committed: [{ code: '11100', by: 'a', owner: 'b' }] } }
  s = finish(s)
  const clay = Object.values(s.assets).find((a) => a.code === '11100')!
  expect(clay).toMatchObject({ owner: 'a', originalOwner: 'b' })
  s = run(s, { type: 'DiscardAsset', asset: clay.id })
  expect(s.investigators[1]!.discard).toContain('11100')
  expect(me(s).discard).not.toContain('11100')
})

it.each([false, true])(
  'Vambrace adds its revelation bonus to encounter and weakness treachery tests (%s)',
  (weak) => {
    const code = weak ? 'field-test-weak' : 'field-test-normal'
    if (weak)
      registerPlayerCards([
        {
          code,
          name: code,
          type: 'treachery',
          class: 'neutral',
          traits: [],
          xp: 0,
          weakness: 'basicweakness',
        },
      ])
    registerTreachery({
      code,
      revelation: (_s, by, self) => [
        {
          type: 'BeginSkillTest',
          investigator: by,
          skill: 'willpower',
          difficulty: 3,
          kind: { type: 'effect', source: self.id, onSuccess: [], onFail: [], onFailEach: [] },
        },
      ],
    })
    let s = withAsset(base(), '09037')
    if (weak)
      s = run(patch({ deck: [code] })(s), { type: 'DrawCards', investigator: 'a', amount: 1 })
    else s = drawEncounter(s, { ...treachery, code })
    expect(skillTestValue(s).total).toBe(4)
  },
)
it('Dreams of the Clay does not cancel a draw from the encounter discard pile', () => {
  let s = withAsset(base(), '11100')
  s = { ...s, encounterDiscard: [treachery] }
  s = run(s, { type: 'DrawFromEncounterDiscard', investigator: 'a', code: treachery.code })
  expect(s.assets['11100']).toBeDefined()
  expect(me(s).resources).toBe(18)
})
it('Counterespionage does not react when a treachery revelation is resolved without drawing it', () => {
  let s = patch({ hand: ['08049'] })(base())
  s = run(s, {
    type: 'ResolveEncounterCard',
    investigator: 'a',
    card: treachery,
    withoutDraw: true,
  })
  expect(me(s).resources).toBe(18)
  expect(me(s).hand).toContain('08049')
})
