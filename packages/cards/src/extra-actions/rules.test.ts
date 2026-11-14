// RR: Actions, Activate, Additional Actions, Basic Actions, Costs, Skill Tests ST.1/ST.8.
import { expect, it } from 'vitest'
import {
  availableAbilities,
  applyInput,
  dispatch,
  getInvestigator,
  playerCardBehavior,
  playerCardDef,
  registerPlayerCard,
  skillTestValue,
  skillValueFor,
  type AbilityOption,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, ghoul, spawnAt } from '@lcg/engine/testing'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'
import data from '../data/extra-actions.json'
import './index'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const base = () => ({
  ...clear(
    patch({
      hand: [],
      resources: 30,
      deck: ['01088', '01089', '01090'],
      discard: [],
      actionsRemaining: 3,
    })(game(['a', 'b'])),
  ),
  interactive: true,
})
const run = (s: GameState, m: Message) => dispatch(clear(s), m)
const b = (code: string) => playerCardBehavior(code)!
const use = (s: GameState, code: string) => {
  const a = Object.values(s.assets).find((a) => a.code === code)!,
    o = b(code).abilities!(s, a, a.owner)[0]! as AbilityOption
  return run(s, {
    type: 'UseAbility',
    investigator: a.owner,
    key: o.key,
    actions: o.actions,
    provokes: o.provokes,
    ...(o.costs ? { costs: o.costs } : {}),
    then: o.then,
  })
}
const done = (s: GameState) =>
  choose(choose({ ...s, chaosBag: [0] }, 'choice.revealToken'), 'choice.applyResults')
const foe = (s: GameState) => clear(dispatch(clear(s), spawnAt('A', { ...ghoul, health: 20 }, 'a')))
const eid = (s: GameState) => Object.keys(s.enemies)[0]!
const play = (s: GameState, code: string) =>
  run(patch({ hand: [code] })(s), {
    type: 'TakeAction',
    investigator: 'a',
    action: { kind: 'play', card: code },
  })
const action = (s: GameState, kind: 'resource' | 'draw') =>
  run(s, { type: 'TakeAction', investigator: 'a', action: { kind } })

it.each(data)('$code registers its distinct reviewed level', (c) => {
  expect(b(c.code)).toBeDefined()
  expect(playerCardDef(c.code)?.xp).toBe(c.xp)
})
it('Eon Chart 1 grants one chosen action, preserving ordinary actions and paying one secret', () => {
  let s = use(withAsset(base(), '08098'), '08098')
  s = choose(s, 'choice.extraAction.investigate')
  s = choose(s, 'action.investigate')
  s = done(s)
  expect(me(s).actionsRemaining).toBe(3)
  expect(me(s).clues).toBe(1)
  expect(s.assets['08098']).toMatchObject({ uses: 2, exhausted: true })
  expect(s.immediateActions).toBeUndefined()
})
it('Eon Chart 4 takes two different action types and reevaluates the second after moving', () => {
  let s = use(withAsset(base(), '08100'), '08100')
  s = choose(s, 'choice.extraAction.move')
  s = choose(s, 'action.move', { location: 'Room B' })
  expect(s.pending?.question.choices.some((c) => c.label === 'choice.extraAction.move')).toBe(false)
  s = choose(s, 'choice.extraAction.investigate')
  s = choose(s, 'action.investigate')
  s = done(s)
  expect(me(s).location).toBe('B')
  expect(me(s).clues).toBe(1)
  expect(me(s).actionsRemaining).toBe(3)
  expect(me(s).actionsTaken).toBe(2)
})
it('printed Eon Chart permits an investigate ability and pays its uses normally', () => {
  let s = withAsset(withAsset(base(), '08098'), '01087')
  s = use(s, '08098')
  s = choose(s, 'choice.extraAction.investigate')
  s = choose(s, 'ability.investigateWith', { card: 'Flashlight' })
  s = done(s)
  expect(s.assets['01087']?.uses).toBe(2)
  expect(me(s).actionsRemaining).toBe(3)
})
it.each(['08098', '08100'])(
  '%s cannot be activated outside the real own turn or with no secrets',
  (code) => {
    const s = withAsset(base(), code),
      a = s.assets[code]!
    expect(b(code).fastOptions!({ ...s, activeTurn: 'b' }, a)).toHaveLength(0)
    expect(b(code).fastOptions!(s, { ...a, uses: 0 })).toHaveLength(0)
  },
)
it('Close the Circle starts with one charge per controlled class, counting itself and excluding neutral', () => {
  let s = withAsset(withAsset(base(), '01030'), '01087')
  s = run(s, { type: 'PutAssetIntoPlay', investigator: 'a', code: '08062' })
  const circle = Object.values(s.assets).find((a) => a.code === '08062')!
  expect(circle.uses).toBe(2)
})
it('Close the Circle permits a basic investigation and offers willpower while preserving its modifier', () => {
  let s = withAsset(withAsset(base(), '08062', { uses: 2 }), '01087')
  s = use(s, '08062')
  expect(s.pending?.question.choices.some((c) => c.label === 'ability.investigateWith')).toBe(false)
  s = choose(s, 'action.investigate')
  s = choose(s, 'choice.test.willpower')
  expect(s.skillTest?.skill).toBe('willpower')
  s = done(s)
  expect(me(s).actionsRemaining).toBe(3)
  expect(s.assets['08062']).toMatchObject({ uses: 1, exhausted: true })
})
it('Close the Circle permits plain asset activation but excludes bold action designators', () => {
  let s = withAsset(withAsset(withAsset(base(), '08062', { uses: 2 }), '01031'), '01087')
  s = use(s, '08062')
  expect(s.pending?.question.choices.some((c) => c.label === 'ability.oldBookLore')).toBe(true)
  expect(s.pending?.question.choices.some((c) => c.params?.card === 'Flashlight')).toBe(false)
})
it('Ace of Rods removes itself and banks an action until it is used later in the same turn', () => {
  let s = use(withAsset(base(), '05040'), '05040')
  expect(s.assets['05040']).toBeUndefined()
  expect(s.bonusActionGrants).toHaveLength(1)
  expect(me(s).actionsRemaining).toBe(3)
  expect(skillValueFor(s, 'a', 'intellect', { type: 'investigate', location: 'A' })).toBe(
    me(s).skills.intellect,
  )
  s = action(s, 'resource')
  s = run(s, { type: 'PlayerWindow', investigator: 'a' })
  s = choose(s, 'ability.extraActionGift', { card: 'Ace of Rods' })
  s = choose(s, 'action.investigate')
  expect(skillTestValue(s).total).toBe(me(s).skills.intellect + 2)
  s = done(s)
  expect(me(s).actionsRemaining).toBe(2)
  expect(s.bonusActionGrants).toHaveLength(0)
  expect(skillValueFor(s, 'a', 'intellect', { type: 'investigate', location: 'A' })).toBe(
    me(s).skills.intellect,
  )
})
it('an unused Ace action expires at turn end and can be used after ordinary actions run out', () => {
  let s = use(withAsset(base(), '05040'), '05040')
  const expired = run(s, { type: 'EndTurn', investigator: 'a' })
  expect(expired.bonusActionGrants).toHaveLength(0)
  s = run(patch({ actionsRemaining: 0 })(s), { type: 'PlayerWindow', investigator: 'a' })
  s = choose(s, 'ability.extraActionGift', { card: 'Ace of Rods' })
  s = choose(s, 'action.resource')
  expect(me(s).resources).toBe(31)
  expect(me(s).actionsRemaining).toBe(0)
})
it('Ace can enter from an opening-hand copy without being played or costing resources', () => {
  let s = patch({ hand: ['05040'] })(base())
  const o = b('05040').openingHandReactions!(s, 'a', ['05040'])[0]!
  s = run(s, {
    type: 'UseAbility',
    investigator: 'a',
    key: o.key,
    actions: 0,
    provokes: false,
    then: o.then,
  })
  expect(Object.values(s.assets).some((a) => a.code === '05040')).toBe(true)
  expect(me(s).hand).not.toContain('05040')
  expect(me(s).resources).toBe(30)
})
it('Haste observes consecutive completed resource actions and grants exactly another resource action', () => {
  let s = withAsset(base(), '06239')
  s = action(s, 'resource')
  expect(
    s.pending?.question.choices.some((c) => c.label === 'ability.extraActionHaste.resource'),
  ).not.toBe(true)
  s = action(s, 'resource')
  s = choose(s, 'ability.extraActionHaste.resource')
  expect(s.pending?.question.choices.map((c) => c.label)).toEqual(['action.resource'])
  s = choose(s, 'action.resource')
  expect(me(s).resources).toBe(33)
  expect(me(s).actionsRemaining).toBe(1)
  expect(s.assets['06239']?.exhausted).toBe(true)
})
it('an intervening action of a different type prevents Haste and fast abilities do not count as actions', () => {
  let s = withAsset(base(), '06239')
  s = action(s, 'resource')
  s = action(s, 'draw')
  s = action(s, 'resource')
  expect(
    s.pending?.question.choices.some((c) => c.label.startsWith('ability.extraActionHaste.')),
  ).not.toBe(true)
})
it('Haste recognizes activation and investigation as simultaneous action types', () => {
  let s = withAsset(withAsset(base(), '06239'), '01087')
  const activate = () => {
    const o = availableAbilities(s, 'a').find((o) => o.params?.card === 'Flashlight')!
    s = run(s, {
      type: 'UseAbility',
      investigator: 'a',
      key: o.key,
      actions: o.actions,
      provokes: o.provokes,
      ...(o.costs ? { costs: o.costs } : {}),
      then: o.then,
    })
    s = done(s)
  }
  activate()
  activate()
  const labels = s.pending?.question.choices.map((c) => c.label)
  expect(labels).toContain('ability.extraActionHaste.activate')
  expect(labels).toContain('ability.extraActionHaste.investigate')
})
it('Sign Magick resolves a different Spell ability, pays its charge, and spends no ordinary action', () => {
  let s = withAsset(withAsset(withAsset(base(), '54008'), '01060'), '02028')
  s = foe(s)
  const o = availableAbilities(s, 'a').find((o) => o.params?.card === 'Shrivelling')!
  s = run(s, {
    type: 'UseAbility',
    investigator: 'a',
    key: o.key,
    actions: o.actions,
    provokes: o.provokes,
    ...(o.costs ? { costs: o.costs } : {}),
    then: o.then,
  })
  s = done(s)
  s = choose(s, 'ability.advancedTest', { card: 'Sign Magick' })
  expect(s.pending?.question.choices.some((c) => c.params?.card === 'Shrivelling')).toBe(false)
  s = choose(s, 'ability.investigateWith', { card: 'Rite of Seeking' })
  s = done(s)
  expect(s.assets['02028']?.uses).toBe(2)
  expect(me(s).actionsRemaining).toBe(2)
  expect(s.assets['54008']?.exhausted).toBe(true)
})
it('Sign Magick has a trait-restricted extra arcane slot', () => {
  expect(b('54008').restrictedSlots).toEqual([
    { slot: 'arcane', count: 1, trait: ['Spell', 'Ritual'] },
  ])
})
it('Task Force pays two actions, resolves its choices separately, and reevaluates the caller location', () => {
  let s = withAsset(base(), '01087')
  s = play(s, '10027')
  expect(me(s).actionsRemaining).toBe(1)
  s = choose(s, 'choice.extraActionClue', { name: 'B' })
  expect(getInvestigator(s, 'b').clues).toBe(1)
  s = choose(s, 'choice.extraActionActivate', { name: 'A' })
  s = choose(s, 'ability.investigateWith', { card: 'Flashlight' })
  s = done(s)
  expect(me(s).actionsRemaining).toBe(1)
  expect(me(s).clues).toBe(1)
  s = choose(s, 'choice.extraActionMove', { name: 'A' })
  s = choose(s, 'choice.moveTo', { location: 'Room B' })
  expect(me(s).location).toBe('B')
})
it('Flurry takes up to four melee fight actions, paying uses and ending its own turn after the last', () => {
  let s = withAsset(foe(base()), '01020')
  s = play(s, '10037')
  for (let n = 0; n < 4; n++) {
    s = choose(s, 'ability.fightWith', { card: 'Machete', enemy: 'Ghoul' })
    s = done(s)
    if (n < 3) s = choose(s, 'choice.extraActionRepeat')
  }
  expect(s.enemies[eid(s)]?.damageTaken).toBe(8)
  expect(me(s).actionsRemaining).toBe(0)
  expect(s.immediateActions).toBeUndefined()
})
it('Flurry cannot be played without a Melee asset and does not offer a firearm ability', () => {
  const s = withAsset(foe(base()), '01016')
  expect(b('10037').canPlay!(s, 'a')).toBe(false)
  const m = withAsset(s, '01020')
  const a = play(m, '10037')
  expect(a.pending?.question.choices.some((c) => c.params?.card === '.45 Automatic')).toBe(false)
})
it('regression: nested actions preserve the previous activation until the outer ability completes', () => {
  registerPlayerCard({
    code: 'haste-sequence-test',
    abilities: (_s, a) => [
      {
        key: a.id + ':use',
        label: 'ability.sequenceTest',
        actions: 1,
        provokes: false,
        then: [{ type: 'GainResources', investigator: a.owner, amount: 1 }],
      },
    ],
  })
  let s = withAsset(withAsset(base(), '06239'), 'haste-sequence-test')
  s = run(s, {
    type: 'UseAbility',
    investigator: 'a',
    key: 'haste-sequence-test:first',
    actions: 1,
    provokes: false,
    then: [{ type: 'GainResources', investigator: 'a', amount: 1 }],
  })
  s = run(s, {
    type: 'UseAbility',
    investigator: 'a',
    key: 'haste-sequence-test:chain',
    actions: 1,
    provokes: false,
    then: [
      { type: 'TakeImmediateAction', investigator: 'a', rule: { types: ['move'] } },
      { type: 'TakeImmediateAction', investigator: 'a', rule: { types: ['investigate'] } },
    ],
  })
  s = choose(s, 'action.move', { location: 'Room B' })
  s = choose(s, 'action.investigate')
  s = done(s)
  expect(
    s.pending?.question.choices.some((c) => c.label === 'ability.extraActionHaste.activate'),
  ).toBe(true)
  expect(me(s).actionsRemaining).toBe(1)
})
it('regression: Close the Circle works outside its own turn and restores that turn and action budget', () => {
  let s: GameState = { ...withAsset(base(), '08062', { uses: 1 }), activeTurn: 'b' }
  s = use(s, '08062')
  s = choose(s, 'action.resource')
  expect(s.activeTurn).toBe('b')
  expect(me(s).actionsRemaining).toBe(3)
  expect(me(s).resources).toBe(31)
  expect(s.immediateActions).toBeUndefined()
})
it('regression: Flurry waives only the first arrow of a three-action Sledgehammer attack', () => {
  let s = withAsset(foe(patch({ actionsRemaining: 4 })(base())), '08096')
  s = play(s, '10037')
  const options = s.pending!.question.choices
  const heavy = options.find((c) => c.then.some((m) => m.type === 'UseAbility' && m.actions === 3))!
  expect(heavy).toBeDefined()
  const index = options.indexOf(heavy)
  // Input through its actual offered choice, retaining the normal three-arrow cost.
  s = applyInput(s, { investigator: s.pending!.investigator, choice: index })
  s = done(s)
  expect(me(s).actionsRemaining).toBe(0)
  expect(s.enemies[eid(s)]?.damageTaken).toBe(6)
})
it('regression: Sign Magick can activate another copy of the same Spell, not the asset just used', () => {
  let s = withAsset(
    withAsset(withAsset(foe(base()), '54008'), '01060', { id: 'spell1' }),
    '01060',
    { id: 'spell2' },
  )
  const o = availableAbilities(s, 'a').find((o) => o.key.startsWith('spell1:'))!
  s = run(s, {
    type: 'UseAbility',
    investigator: 'a',
    key: o.key,
    actions: o.actions,
    provokes: o.provokes,
    ...(o.costs ? { costs: o.costs } : {}),
    then: o.then,
  })
  s = done(s)
  s = choose(s, 'ability.advancedTest', { card: 'Sign Magick' })
  expect(s.pending?.question.choices).toHaveLength(1)
  s = choose(s, 'ability.fightWithSkill', {
    card: 'Shrivelling',
    enemy: 'Ghoul',
    skill: 'willpower',
  })
  s = done(s)
  expect(s.assets.spell1?.uses).toBe(3)
  expect(s.assets.spell2?.uses).toBe(3)
  expect(me(s).actionsRemaining).toBe(2)
})
it('regression: granting a two-step Chart does not insert a free player window between its actions', () => {
  let s = use(withAsset(base(), '08100'), '08100')
  s = choose(s, 'choice.extraAction.move')
  s = choose(s, 'action.move', { location: 'Room B' })
  expect(s.pending?.question.choices.every((c) => c.label.startsWith('choice.extraAction.'))).toBe(
    true,
  )
})
it('regression: a second Haste cannot enter play through putting or ordinary playing', () => {
  const s = withAsset(base(), '06239')
  const next = run(s, { type: 'PutAssetIntoPlay', investigator: 'a', code: '06239' })
  expect(Object.values(next.assets).filter((a) => a.code === '06239')).toHaveLength(1)
})
it('Task Force chooses movement from the physical location while its controller resolves as if elsewhere', () => {
  let s: GameState = withAsset(base(), '01087')
  s = patch({ location: 'B' })(s)
  s = { ...s, asIfLocations: [{ investigator: 'a', at: 'B', physical: 'A' }] }
  s = play(s, '10027')
  s = choose(s, 'choice.extraActionMove', { name: 'A' })
  expect(s.pending?.question.choices.map((c) => c.params?.location)).toEqual(['Room B'])
  s = choose(s, 'choice.moveTo', { location: 'Room B' })
  expect(s.asIfLocations?.[0]?.physical).toBe('B')
})
