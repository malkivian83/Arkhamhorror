// RR: Experience, Campaign Play, Permanent, Equipment Slots, Skill Test Timing.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardDef,
  playerCardBehavior,
  allPlayerCardDefs,
  registerPlayerCards,
  registerPlayerCard,
  handSize,
  canCommitFrom,
  skillTestValue,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, throughSetup } from '@lcg/engine/testing'
import { game, patch, withAsset, me } from '../dunwich-pilot/testing'
import {
  newCampaign,
  purchaseOptions,
  purchase,
  customize,
  finishScenario,
  startScenario,
  type Campaign,
} from '../campaign'
import { validateDeck, cardPool, requiredDeckSize, isStandard } from '../decks'
import { startingExperience } from '../survivor-deck/card-08125'
import { upgradeDiscount } from './economy'
import data from '../data/campaign-planning.json'
import './index'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const run = (s: GameState, ...m: Message[]) => dispatch(clear(s), ...m)
const base = () =>
  clear(patch({ hand: [], resources: 10, deck: ['01088', '01089', '01090'] })(game()))
const between = (key = 'mateo', deck?: string[], xp = 20): Campaign => {
  const c = newCampaign('night-of-the-zealot', [key], 'standard')
  const i = c.investigators[0]!
  return {
    ...c,
    scenarioIndex: 1,
    results: [{ scenario: 'the-gathering', outcome: { type: 'noResolution' }, xp: { [i.id]: 0 } }],
    investigators: [
      { ...i, deck: deck ?? i.deck, planning: { arcane: 0, rabbit: false, upgrades: 0 } },
    ],
    log: { ...c.log, investigators: { [i.id]: { ...c.log.investigators[i.id]!, xp } } },
  }
}
const option = (c: Campaign, code: string, replaces?: string) =>
  purchaseOptions(c, c.investigators[0]!.id).find(
    (o) => o.code === code && (replaces ? o.replaces === replaces : !o.replaces && !o.exchange),
  )
const spell = (xp: number) =>
  allPlayerCardDefs().find((c) => c.name === 'Shrivelling' && c.xp === xp)!.code
it.each(data)('$code is registered once with its reviewed behavior', (d) => {
  expect(playerCardDef(d.code)).toMatchObject(d)
  expect(playerCardBehavior(d.code)).toBeTruthy()
  if (d.code !== '10109' && !['54007', '54012'].includes(d.code))
    expect(playerCardBehavior(d.code)?.permanent).toEqual({})
})
it('Arcane Research discounts only the first upgraded Spell and combines both copies with Rabbit Hole', () => {
  let c = between('mateo', [spell(0), spell(0), '04109', '04109', '08059'])
  c.investigators[0]!.planning = { arcane: 2, rabbit: true, upgrades: 0 }
  const id = c.investigators[0]!.id
  expect(option(c, spell(3), spell(0))!.cost).toBe(0)
  c = purchase(c, id, spell(3), { upgrade: true, replaces: spell(0) })
  expect(option(c, spell(3), spell(0))!.cost).toBe(2)
  c = purchase(c, id, spell(3), { upgrade: true, replaces: spell(0) })
  expect(c.investigators[0]!.planning).toMatchObject({ arcaneUsed: true, upgrades: 2 })
})
it('buying Arcane Research causes trauma without retroactively granting its discount', () => {
  let c = between('mateo', [spell(0)])
  const id = c.investigators[0]!.id
  c = purchase(c, id, '04109')
  expect(c.log.investigators[id]!.mentalTrauma).toBe(1)
  expect(option(c, spell(3), spell(0))!.cost).toBe(3)
})
it('Arcane Research checks the card being upgraded, not just the new Spell trait', () => {
  const self = between().investigators[0]!
  self.planning = { arcane: 2, rabbit: false, upgrades: 0 }
  expect(upgradeDiscount(self, '01088')).toBe(0)
})
it('Rabbit Hole leaves mandatory level 0 fills free, increases new purchases, and uses Pelt only on the next new card', () => {
  let c = between('mateo', ['08059', spell(0)], 20)
  const id = c.investigators[0]!.id
  c.investigators[0]!.planning = { arcane: 0, rabbit: true, upgrades: 0, pelt: 2 }
  const candidate = cardPool(id).find((d) => d.xp === 1 && !playerCardBehavior(d.code)?.permanent)!
  expect(option(c, '01088')!.cost).toBe(0)
  expect(option(c, candidate.code)!.cost).toBe(1)
  c = purchase(c, id, candidate.code)
  expect(c.investigators[0]!.planning!.peltUsed).toBe(true)
  const other = cardPool(id).find(
    (d) => d.xp === 1 && d.code !== candidate.code && !playerCardBehavior(d.code)?.permanent,
  )!
  expect(option(c, other.code)!.cost).toBe(2)
})
it('creation-only permanents cannot be purchased between scenarios', () => {
  const c = between('mateo')
  for (const code of ['08031', '08046', '08059', '11095']) expect(option(c, code)).toBeUndefined()
})
it('Ascetic adds ten initial experience and prevents earning even after elimination', () => {
  expect(startingExperience(['11095', '08125'])).toBe(13)
  let s = patch({ cannotEarnExperience: true })(base())
  s = run(s, { type: 'EarnExperience', investigator: 'a', amount: 5 })
  expect(s.campaignLog?.investigators.a?.xp ?? 0).toBe(0)
  expect(s.experience?.[0]?.amount).toBe(0)
  s = run(s, { type: 'EliminateInvestigator', investigator: 'a' })
  s = run(s, { type: 'EarnExperience', investigator: 'a', amount: 5 })
  expect(s.campaignLog?.investigators.a?.xp ?? 0).toBe(0)
})
it.each([false, true])('Obol grants two experience on survival/resignation (%s)', (resigned) => {
  const c = newCampaign('night-of-the-zealot', ['daniela'], 'standard')
  c.investigators[0]!.deck.push('03308')
  let s = throughSetup(
    startScenario(
      {
        ...c,
        investigators: c.investigators.map((i) => ({
          ...i,
          deck: i.deck.filter((c) => c !== '03308'),
        })),
      },
      3,
    ),
  )
  s = {
    ...s,
    scenarioId: 'the-gathering',
    outcome: { type: 'noResolution' },
    campaignLog: JSON.parse(JSON.stringify(c.log)),
    investigators: s.investigators.map((i) => ({ ...i, resigned, eliminated: resigned })),
  }
  const next = finishScenario(c, s)
  expect(next.results[0]!.xp[c.investigators[0]!.id]).toBe(2)
  expect(next.log.investigators[c.investigators[0]!.id]!.killed).not.toBe(true)
})
it('Obol kills a defeated investigator and gives no survival bonus', () => {
  const c = newCampaign('night-of-the-zealot', ['daniela'], 'standard')
  let s = throughSetup(startScenario(c, 3))
  c.investigators[0]!.deck.push('03308')
  s = {
    ...s,
    outcome: { type: 'noResolution' },
    campaignLog: JSON.parse(JSON.stringify(c.log)),
    investigators: s.investigators.map((i) => ({ ...i, eliminated: true, resigned: false })),
  }
  const next = finishScenario(c, s),
    id = c.investigators[0]!.id
  expect(next.log.investigators[id]!.killed).toBe(true)
  expect(next.results[0]!.xp[id]).toBe(0)
  expect(c.log.investigators[id]!.killed).not.toBe(true)
})
it('Versatile grants five cards and one extra level 0 card for each copy', () => {
  expect(requiredDeckSize('60451', ['06167', '06167'])).toBe(
    (playerCardDef('60451')!.deckSize ?? 30) + 10,
  )
  expect(cardPool('60451', { deck: ['06167'] }).some((c) => c.name === 'Magnifying Glass')).toBe(
    true,
  )
  const cards = ['06167', '01030', '01030']
  const errors = validateDeck({ id: 'x', name: 'x', investigator: '60451', cards }, false).problems
  expect(errors.some((e) => e.key === 'deck.problem.notAllowed')).toBe(true)
  const legal = validateDeck(
    { id: 'x', name: 'x', investigator: '60451', cards: ['06167', '06167', '01030', '01030'] },
    false,
  ).problems
  expect(legal.some((e) => e.key === 'deck.problem.notAllowed')).toBe(false)
})
it('Underworld Support reduces size and prohibits duplicate titles across printings, while Forced Learning adds fifteen', () => {
  expect(requiredDeckSize('60451', ['08046'])).toBe((playerCardDef('60451')!.deckSize ?? 30) - 5)
  expect(requiredDeckSize('60451', ['08031'])).toBe((playerCardDef('60451')!.deckSize ?? 30) + 15)
  const check = validateDeck(
    { id: 'x', name: 'x', investigator: '60451', cards: ['08046', '01088', '01588'] },
    false,
  )
  expect(check.problems.some((p) => p.key === 'deck.problem.tooManyCopies')).toBe(true)
})
it('Pelt Shipment reduces hand limit per copy and records the combined next-purchase discount', () => {
  let s = patch({ hand: ['10109', '10109'] })(base())
  expect(handSize(s, 'a')).toBe(2)
  s = dispatch(s, ...playerCardBehavior('10109')!.whenGameEndsInHand!(s, 'a'))
  expect(s.campaignLog!.values['peltShipment:a']).toBe('2')
  expect(playerCardBehavior('10109')!.canPlay!(s, 'a')).toBe(false)
})
it('Pelt Shipment does not reduce hand size while stored outside the hand', () => {
  const s = withAsset(base(), '10121', { storedCards: [{ code: '10109', owner: 'a' }] })
  expect(handSize(s, 'a')).toBe(8)
})
it('Adaptable swaps at most two level 0 cards and validates the outgoing level', () => {
  let c = between('jenny', ['02110', '01088', '01089', '01090'])
  const id = c.investigators[0]!.id
  const swap = (c: Campaign) =>
    purchaseOptions(c, id).find((o) => o.exchange && o.code === '01030')!
  expect(swap(c)).toMatchObject({ cost: 0, needsRemoval: true })
  c = purchase(c, id, '01030', { upgrade: true, remove: '01088' })
  c = purchase(c, id, '01030', { upgrade: true, remove: '01089' })
  expect(c.investigators[0]!.planning!.swaps).toBe(2)
  expect(purchaseOptions(c, id).some((o) => o.exchange)).toBe(false)
})
const add = (s: GameState, code: string, id = code) => withAsset(s, code, { id })
it('Hierophant shares accessory and arcane slots without creating extras for each type', () => {
  registerPlayerCards([
    {
      code: 'plan-accessory',
      name: 'Accessory',
      type: 'asset',
      class: 'neutral',
      traits: [],
      slots: ['accessory'],
    },
    {
      code: 'plan-arcane',
      name: 'Arcane',
      type: 'asset',
      class: 'neutral',
      traits: [],
      slots: ['arcane'],
    },
  ])
  registerPlayerCard({ code: 'plan-accessory' })
  registerPlayerCard({ code: 'plan-arcane' })
  let s = add(base(), '54007')
  for (let n = 0; n < 4; n++) s = add(s, 'plan-accessory', 'acc' + n)
  expect(run(s, { type: 'CheckSlots', investigator: 'a' }).pending).toBeNull()
  s = add(s, 'plan-arcane', 'extra')
  expect(run(s, { type: 'CheckSlots', investigator: 'a' }).pending?.question.prompt).toBe(
    'prompt.freeSlot',
  )
})
it('Occult Reliquary grants exactly one shared Blessed/Cursed slot', () => {
  registerPlayerCards([
    {
      code: 'plan-blessed',
      name: 'Blessed',
      type: 'asset',
      class: 'neutral',
      traits: ['Blessed'],
      slots: ['accessory'],
    },
    {
      code: 'plan-mundane',
      name: 'Mundane',
      type: 'asset',
      class: 'neutral',
      traits: [],
      slots: ['accessory'],
    },
  ])
  let s = add(add(add(base(), '10132'), 'plan-mundane', 'm1'), 'plan-blessed', 'b1')
  expect(run(s, { type: 'CheckSlots', investigator: 'a' }).pending).toBeNull()
  s = add(s, 'plan-blessed', 'b2')
  expect(run(s, { type: 'CheckSlots', investigator: 'a' }).pending?.question.prompt).toBe(
    'prompt.freeSlot',
  )
  const mundane = add(add(add(base(), '10132'), 'plan-mundane', 'm1'), 'plan-mundane', 'm2')
  expect(run(mundane, { type: 'CheckSlots', investigator: 'a' }).pending).not.toBeNull()
})
it('Moon Pendant allows a second Tarot on entry and adds two wild icons to other non-weakness Tarot commitments', () => {
  let s = add(base(), '05035')
  s = run(patch({ hand: ['54012'] })(s), {
    type: 'PutAssetIntoPlay',
    investigator: 'a',
    code: '54012',
    fromHand: true,
  })
  expect(Object.values(s.assets).some((a) => a.code === '54012')).toBe(true)
  expect(s.pending?.question.prompt).not.toBe('prompt.freeSlot')
  s = run(patch({ hand: ['05023'] })(s), {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'intellect',
    difficulty: 1,
    kind: { type: 'effect', source: 'tarot', onSuccess: [], onFail: [], onFailEach: [] },
  })
  expect(canCommitFrom(s, 'a', '05023', 'hand')).toBe(true)
  const before = skillTestValue(s).total
  s = run(s, { type: 'CommitCard', investigator: 'a', code: '05023' })
  expect(skillTestValue(s).total).toBe(before + 2)
})
it.each(['54007', '54012'])('%s offers its printed optional opening-hand entry', (code) => {
  const s = base(),
    options = playerCardBehavior(code)!.openingHandReactions!(s, 'a', [code])
  expect(options).toHaveLength(1)
  expect(options[0]!.then).toEqual([
    { type: 'PutAssetIntoPlay', investigator: 'a', code, fromHand: true },
  ])
})

it('Rabbit Hole applies its surcharge before the new-card minimum, so a level 0 replacement costs one', () => {
  const c = between('mateo', ['08059', spell(0)])
  c.investigators[0]!.owedFills = 100
  expect(option(c, '01088')!.cost).toBe(1)
})
it('the flexible slot is declared and may be reassessed on entry of another controlled asset', () => {
  let s = withAsset(base(), '10132', { flexibleSlot: 'hand' })
  const messages = playerCardBehavior('10132')!.forced!(
    s,
    { type: 'afterAssetEntersPlay', asset: '10132', investigator: 'a' },
    s.assets['10132']!,
  )
  s = dispatch(s, ...messages)
  expect(s.pending?.question.prompt).toBe('prompt.flexibleSlot')
  s = choose(s, 'slot.accessory')
  expect(s.assets['10132']!.flexibleSlot).toBe('accessory')
})
it('a controlled Moon Pendant supplies icons to eligible Tarot in hand and every Tarot already committed', () => {
  let s = clear(patch({ hand: ['05023'] }, 'b')(game(['a', 'b'])))
  s = withAsset(s, '54012', { id: 'pendant-a', owner: 'a' })
  s = withAsset(s, '54012', { id: 'pendant-b', owner: 'b' })
  s = run(s, {
    type: 'BeginSkillTest',
    investigator: 'b',
    skill: 'intellect',
    difficulty: 1,
    kind: { type: 'effect', source: 'tarot', onSuccess: [], onFail: [], onFailEach: [] },
  })
  expect(canCommitFrom(s, 'b', '05023', 'hand')).toBe(true)
  s = run(s, { type: 'CommitCard', investigator: 'b', code: '05023' })
  expect(skillTestValue(s).icons).toBe(4)
})

it('Forced Learning replaces only the upkeep draw with two cards and a chosen discard', () => {
  let s = withAsset({ ...base(), interactive: true }, '08031')
  s = run(s, { type: 'UpkeepPhase' })
  expect(me(s).hand).toEqual(['01088', '01089'])
  expect(s.pending?.question.prompt).toBe('prompt.chooseCardToDiscard')
  s = choose(s, 'choice.discard', { card: '01088' })
  expect(me(s).hand).toEqual(['01089'])
  expect(me(s).discard).toContain('01088')
})
it('creation grants Ascetic experience, charges trauma per Arcane Research copy, and carries the earn restriction into play', () => {
  const plain = newCampaign('night-of-the-zealot', ['mateo'], 'standard')
  const member = plain.investigators[0]!
  const c = newCampaign(
    'night-of-the-zealot',
    [{ investigator: member.id, cards: [...member.deck, '04109', '04109', '11095'] }],
    'standard',
  )
  expect(c.log.investigators[member.id]!.mentalTrauma).toBe(2)
  expect(c.log.investigators[member.id]!.xp).toBe(15)
  expect(startScenario(c, 1).investigators[0]!.cannotEarnExperience).toBe(true)
})
it('a customizable sheet consumes only one Rabbit Hole discount in the period', () => {
  let c = between('mateo')
  c.investigators[0]!.deck.push('08059', '09119')
  c.investigators[0]!.deck.splice(c.investigators[0]!.deck.findIndex(isStandard), 1)
  const id = c.investigators[0]!.id
  c.investigators[0]!.planning = { arcane: 0, rabbit: true, upgrades: 0 }
  c = customize(c, id, '09119', { railshooter: 1 })
  expect(c.log.investigators[id]!.xp).toBe(20)
  expect(c.investigators[0]!.planning!.upgrades).toBe(1)
  c = customize(c, id, '09119', { railshooter: 1, telescanner: 2 })
  expect(c.log.investigators[id]!.xp).toBe(18)
  expect(c.investigators[0]!.planning!.upgrades).toBe(1)
})
