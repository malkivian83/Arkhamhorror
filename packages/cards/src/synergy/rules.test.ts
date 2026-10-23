import {
  allPlayerCardDefs,
  dispatch,
  getInvestigator,
  playableCards,
  playerCardDef,
  registerPlayerCards,
  skillTestValue,
  type GameState,
} from '@lcg/engine'
import { choose, chooseWithConsent, during } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { holding } from '../basic-events/testing'
import { resolve } from '../basic-abilities/testing'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard } from '../decks'
import { controlledClasses } from './classes'
import approvals from './approvals.json'
import './index'

const classes = ['guardian', 'seeker', 'rogue', 'mystic', 'survivor']
registerPlayerCards([
  ...[...classes, 'neutral', 'mythos'].map((c) => ({
    code: 'synergy-' + c,
    name: c,
    type: 'asset' as const,
    class: c,
    traits: [],
  })),
  { code: 'synergy-event', name: 'Attached event', type: 'event', class: 'mystic', traits: [] },
])
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const labels = (s: GameState) => s.pending?.question.choices.map((c) => c.label) ?? []
const withClass = (s: GameState, c: string, owner = 'a') => withAsset(s, 'synergy-' + c, { owner })
function open(code = '08050'): GameState {
  return during(holding(code, { players: ['a', 'b'], enemy: null }), (s) =>
    withClass(patch({ hand: [] }, 'b')(s), 'guardian'),
  )
}
const begin = (s: GameState, tags: string[] = []): GameState =>
  dispatch(clear(s), {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'intellect',
    difficulty: 0,
    tags,
    kind: { type: 'effect', source: 'synergy-test', onSuccess: [], onFail: [], onFailEach: [] },
  })
const propose = (s: GameState, name = 'A') =>
  choose(s, 'ability.playFastFor', { name, card: 'Cheat the System' })
const confirm = (s: GameState) => choose(s, 'ability.playCard', { card: 'Cheat the System' })
const fast = (s: GameState) => choose(s, 'action.playFast', { card: 'Cheat the System' })

// RR: Ability, Limbo, Ownership and Control, Synergy FAQ 2.27. Only cards in
// play count; classless and encounter cards, resolving events and skills do not.
it('counts the investigator class but does not count the resolving event itself', () => {
  const id = allPlayerCardDefs().find(
    (c) => c.type === 'investigator' && c.class === 'guardian',
  )!.code
  let s = game([id])
  expect(controlledClasses(s, id)).toBe(1)
  s = during({ ...s, interactive: true }, patch({ hand: ['08050'], resources: 0 }, id))
  s = fast(s)
  expect(getInvestigator(s, id).resources).toBe(1)
})
it('deduplicates classes and excludes hand, deck, discard, other controllers and neutral cards', () => {
  let s = open()
  s = withClass(withClass(withClass(s, 'neutral'), 'mythos'), 'rogue', 'b')
  s = patch({
    hand: ['08050', 'synergy-rogue'],
    deck: ['synergy-seeker'],
    discard: ['synergy-survivor'],
  })(s)
  s = withAsset(s, 'synergy-guardian', { id: 'another-guardian' })
  expect(controlledClasses(s, 'a')).toBe(1)
  expect(me(fast(during(s, (x) => x))).resources).toBe(11)
})
it('counts both printed classes of a multiclass asset and follows current asset control', () => {
  let s = withAsset(open(), '08105', { originalOwner: 'b' })
  expect(controlledClasses(s, 'a')).toBe(3)
  s = {
    ...s,
    assets: { ...s.assets, '08105': { ...s.assets['08105']!, owner: 'b' } },
  }
  expect(controlledClasses(s, 'a')).toBe(1)
  expect(controlledClasses(s, 'b')).toBe(2)
})
it('counts attached events for their controller even on a host controlled by another investigator', () => {
  let s = withAsset(open(), 'synergy-neutral', {
    owner: 'b',
    upgrades: [{ code: 'synergy-event', owner: 'a' }],
  })
  expect(controlledClasses(s, 'a')).toBe(2)
  expect(controlledClasses(s, 'b')).toBe(0)
  s = withAsset(s, 'synergy-neutral', { upgrades: [{ code: 'synergy-event', owner: 'b' }] })
  expect(controlledClasses(s, 'a')).toBe(1)
  expect(controlledClasses(s, 'b')).toBe(1)
})
it('does not count committed skills, including Strength in Numbers itself', () => {
  let s = begin(open('08077'))
  expect(s.pending!.question.choices.find((c) => c.label === 'choice.commit')!.params!.icons).toBe(
    2,
  )
  s = choose(s, 'choice.commit', { card: 'Strength in Numbers' })
  expect(controlledClasses(s, 'a')).toBe(1)
  expect(skillTestValue(s).icons).toBe(2)
})
it('Strength in Numbers tracks control changes during the test and reaches six icons with five classes', () => {
  let s = choose(begin(open('08077')), 'choice.commit', { card: 'Strength in Numbers' })
  s = { ...s, assets: {} }
  expect(skillTestValue(s).icons).toBe(1)
  s = classes.reduce((x, c) => withClass(x, c), s)
  expect(skillTestValue(s).icons).toBe(6)
})
it('Strength in Numbers uses the committer cards when helping another investigator', () => {
  let s = open('08077')
  s = patch({ hand: [] })(patch({ hand: ['08077'] }, 'b')(withClass(s, 'seeker', 'b')))
  s = chooseWithConsent(begin(s), 'choice.commitFrom', { card: 'Strength in Numbers' })
  expect(skillTestValue(s).icons).toBe(2)
})
it('a classless setup cannot play a resource event that would change nothing', () => {
  const s = { ...open(), assets: {} }
  expect(playableCards(s, 'a', true)).not.toContain('08050')
})

// RR: Fast, Player Windows, Peril. Other players retain their own decision;
// playing a fast event does not spend actions or change the active turn.
it('plays in the own action window once without duplicate fast choices', () => {
  const before = open()
  expect(labels(before).filter((x) => x === 'action.playFast')).toHaveLength(1)
  expect(labels(before)).not.toContain('ability.playFastFor')
  const s = fast(before)
  expect(me(s).resources).toBe(11)
  expect(me(s).actionsRemaining).toBe(me(before).actionsRemaining)
  expect(s.activeTurn).toBe(before.activeTurn)
  expect(me(s).discard).toContain('08050')
})
it.each(['mythos', 'enemy', 'upkeep'] as const)(
  'offers and resolves the event in a %s player window',
  (phase) => {
    const before = open()
    const steps = { mythos: 'mythosEnds', enemy: 'enemyBegins', upkeep: 'upkeepBegins' } as const
    let s = dispatch(clear({ ...before, phase }), { type: 'Step', step: steps[phase] })
    s = confirm(propose(s))
    expect(me(s).resources).toBe(11)
    expect(me(s).actionsRemaining).toBe(me(before).actionsRemaining)
    expect(s.activeTurn).toBe(before.activeTurn)
  },
)
it('offers the event in a skill-test window and preserves the test continuation', () => {
  let s = begin(open())
  const before = me(s).actionsRemaining
  s = confirm(propose(s))
  expect(s.pending!.question.prompt).toBe('prompt.commitCards')
  expect(me(s).resources).toBe(11)
  expect(me(s).actionsRemaining).toBe(before)
  s = resolve(s)
  expect(s.skillTest).toBeNull()
})
it('asks the owner before playing their card during another investigator turn', () => {
  let s = open()
  s = during(s, (x) =>
    withClass(patch({ hand: [] })(patch({ hand: ['08050'], resources: 0 }, 'b')(x)), 'seeker', 'b'),
  )
  expect(s.activeTurn).toBe('a')
  s = propose(s, 'B')
  expect(s.pending!.investigator).toBe('b')
  expect(s.investigators[1]!.hand).toContain('08050')
  const restored = JSON.parse(JSON.stringify(s)) as GameState
  s = confirm(restored)
  expect(s.investigators[1]!.resources).toBe(1)
  expect(s.investigators[1]!.discard).toContain('08050')
  expect(s.activeTurn).toBe('a')
})
it('lets an owner decline without spending the card or resources', () => {
  let s = dispatch(clear(open()), { type: 'InvestigatorFastWindow' })
  s = choose(propose(s), 'choice.skip')
  expect(me(s).hand).toContain('08050')
  expect(me(s).resources).toBe(10)
})
it('allows another investigator in a normal test but excludes their event during peril', () => {
  let s = open()
  s = patch({ hand: [] })(patch({ hand: ['08050'] }, 'b')(withClass(s, 'rogue', 'b')))
  expect(labels(begin(s))).toContain('ability.playFastFor')
  expect(labels(begin(s, ['peril']))).not.toContain('ability.playFastFor')
  expect(labels(begin(open(), ['peril']))).toContain('ability.playFastFor')
})
it('does not expand fast cards without printed permission to other player windows', () => {
  const s = dispatch(clear(open('03155')), { type: 'InvestigatorFastWindow' })
  expect(labels(s)).not.toContain('ability.playFastFor')
})
it('retains elimination and blocked-event restrictions in phase and test windows', () => {
  for (const changes of [
    { eliminated: true },
    { blockedTypes: [{ cardType: 'event', round: open().round }] },
  ]) {
    const s = patch(changes)(open())
    const phase = dispatch(clear(s), { type: 'InvestigatorFastWindow' })
    expect(labels(phase)).not.toContain('ability.playFastFor')
    if (!changes.eliminated) expect(labels(begin(s))).not.toContain('ability.playFastFor')
  }
})
// RR: Deck Customization. Registration, real shop and scenario integration.
it.each(approvals.cards)('$code has one catalog/shop entry and enters a scenario', ({ code }) => {
  expect(allPlayerCardDefs().filter((c) => c.code === code)).toHaveLength(1)
  let c = newCampaign('brethren-of-ash', [code === '08050' ? 'jenny' : 'pete'], 'easy')
  const id = c.investigators[0]!.id
  c.log.investigators[id]!.xp = 5
  expect(purchaseOptions(c, id).filter((o) => o.code === code)).toHaveLength(1)
  c = purchase(c, id, code, { remove: c.investigators[0]!.deck.find(isStandard)! })
  const i = startScenario(c, 3, false).investigators[0]!
  expect([...i.hand, ...i.deck, ...i.discard]).toContain(code)
  expect(playerCardDef(code)!.xp).toBe(1)
})
