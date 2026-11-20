// RR: Archive of Conduits additional costs, research, movement, uses and optional effects.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  playerCardDef,
  type GameState,
  type Asset,
  type Message,
  type AbilityOption,
} from '@lcg/engine'
import { newTestGame, throughSetup, choose, spawnAt, ghoul } from '@lcg/engine/testing'
import './index'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const base = (): GameState => {
  const s = clear(throughSetup(newTestGame({ players: ['a', 'b'] })))
  return {
    ...s,
    activeTurn: 'a',
    phase: 'investigation' as const,
    interactive: true,
    locations: Object.fromEntries(
      Object.entries(s.locations).map(([id, l]) => [id, { ...l, revealed: true, clues: 3 }]),
    ),
    investigators: s.investigators.map((i) => ({
      ...i,
      actionsRemaining: 3,
      resources: 20,
      hand: [],
      deck: ['normal', 'normal', 'normal'],
      damage: 3,
      horror: 3,
    })),
  }
}
const owned = (code: string, uses = 4): GameState => {
  const s = base()
  const a: Asset = { id: code, code, owner: 'a', uses, exhausted: false, damage: 0, horror: 0 }
  return { ...s, assets: { [code]: a } }
}
const run = (s: GameState, ...m: Message[]) => dispatch(clear(s), ...m)
const by = (s: GameState, id = 'a') => s.investigators.find((i) => i.id === id)!
const use = (s: GameState, code: string) => {
  const a = s.assets[code]!,
    o: AbilityOption = playerCardBehavior(code)!.abilities!(s, a, 'a')[0]!
  expect(o).toBeDefined()
  return run(s, { type: 'UseAbility', investigator: 'a', ...o })
}
it('requires four distinct locations as a play cost and preserves existing lines', () => {
  let s = base()
  expect(playerCardBehavior('08033')!.canPlay!(s, 'a')).toBe(false)
  s = { ...s, locations: { ...s.locations, D: { ...s.locations.C!, id: 'D', name: 'Room D' } } }
  expect(playerCardBehavior('08033')!.canPlay!(s, 'a')).toBe(true)
  s = run(s, ...playerCardBehavior('08033')!.additionalPlayCosts!(s, 'a'))
  for (const id of ['A', 'B', 'C', 'D']) {
    s = choose(s, 'choice.location', { location: 'Room ' + id })
    if (s.pending)
      expect(s.pending.question.choices.some((c) => c.params?.location === 'Room ' + id)).toBe(
        false,
      )
  }
  expect(Object.values(s.locations).map((l) => l.leylines)).toEqual([1, 1, 1, 1])
})
it('collects a leyline after successful investigation, exhausts, and identifies only on the fourth', () => {
  let s = owned('08033', 3)
  s = { ...s, locations: { ...s.locations, A: { ...s.locations.A!, leylines: 2 } } }
  const t = {
    type: 'afterSkillTest' as const,
    investigator: 'a',
    kind: 'investigate' as const,
    succeeded: true,
    margin: 1,
    location: 'A',
  }
  const b = playerCardBehavior('08033')!,
    a = s.assets['08033']!
  expect(b.reactions!(s, { ...t, succeeded: false }, a)).toEqual([])
  expect(b.reactions!(s, { ...t, investigator: 'b' }, a)).toEqual([])
  s = run(s, ...b.reactions!(s, t, a)[0]!.then)
  expect(s.locations.A!.leylines).toBe(1)
  expect(s.assets['08033']).toBeUndefined()
  expect(by(s).resources).toBe(24)
  expect(s.campaignLog!.notes).toContain('identifiedGateway')
})
it.each(['08041', '08042', '08043', '08044'])(
  '%s requires research and places exactly one of its four lines on the correct kind of card',
  (code) => {
    let s = owned(code)
    s = run(s, spawnAt('A', { ...ghoul, traits: ['Monster'] }))
    const a = s.assets[code]!,
      b = playerCardBehavior(code)!
    expect(b.requiredResearch).toBe('identifiedGateway')
    expect(playerCardDef(code)!.uses!.count).toBe(4)
    const o = b.fastOptions!(s, a)[0]!
    s = run(s, ...o.then)
    s = choose(s, s.pending!.question.choices[0]!.label, s.pending!.question.choices[0]!.params)
    expect(s.assets[code]!.uses).toBe(3)
    expect(
      code === '08042'
        ? s.locations.A!.leylines
        : code === '08044'
          ? by(s).leylines
          : Object.values(s.enemies)[0]!.leylines,
    ).toBe(1)
    expect(
      b.fastOptions!(
        { ...s, assets: { [code]: { ...s.assets[code]!, uses: 0 } } },
        { ...s.assets[code]!, uses: 0 },
      ),
    ).toEqual([])
  },
)
it.each(['08041', '08043'])('%s cannot place a leyline on an Elite enemy', (code) => {
  const s = run(owned(code), spawnAt('A', { ...ghoul, traits: ['Elite'] }))
  expect(playerCardBehavior(code)!.fastOptions!(s, s.assets[code]!)).toEqual([])
})
it('Tindalos moves any investigator to a revealed marked enemy and optionally removes a line for one damage', () => {
  let s = run(owned('08041'), spawnAt('C', { ...ghoul, health: 8 }))
  const e = Object.values(s.enemies)[0]!
  s = run(s, { type: 'AdjustLeylines', target: { type: 'enemy', id: e.id }, amount: 2 })
  s = use(s, '08041')
  s = choose(s, 'choice.conduitTravel', { name: 'B' })
  expect(by(s, 'b').location).toBe('C')
  s = choose(s, 'choice.conduitRemove')
  expect(s.enemies[e.id]!.damageTaken).toBe(1)
  expect(s.enemies[e.id]!.leylines).toBe(1)
  expect(by(s).actionsRemaining).toBe(2)
})
it('Acheron may leave a line in place, without investigating', () => {
  let s = owned('08042')
  s = run(s, { type: 'AdjustLeylines', target: { type: 'location', id: 'C' }, amount: 1 })
  s = use(s, '08042')
  s = choose(s, 'choice.conduitTravel', { name: 'B' })
  s = choose(s, 'choice.skip')
  expect(by(s, 'b').location).toBe('C')
  expect(s.locations.C!.leylines).toBe(1)
  expect(s.skillTest).toBeNull()
})
it('Aldebaran disengages, moves one connection, then optionally automatically evades without an attack of opportunity', () => {
  let s = run(owned('08043'), spawnAt('A', { ...ghoul, health: 8 }, 'a'))
  const e = Object.values(s.enemies)[0]!
  s = run(s, { type: 'AdjustLeylines', target: { type: 'enemy', id: e.id }, amount: 1 })
  s = use(s, '08043')
  s = choose(s, 'choice.conduitEvadeMove', { name: 'A' })
  s = choose(s, 'choice.conduitRemove')
  expect(by(s).location).toBe('B')
  expect(by(s).damage).toBe(3)
  expect(s.enemies[e.id]!.engagedWith).toBeNull()
  expect(s.enemies[e.id]!.exhausted).toBe(true)
  expect(s.enemies[e.id]!.leylines).toBe(0)
})
it.each([false, true])(
  'Paradise keeps/removes the line and draws/heals the corresponding amount (%s)',
  (remove) => {
    let s = owned('08044')
    s = run(s, { type: 'AdjustLeylines', target: { type: 'investigator', id: 'b' }, amount: 1 })
    s = use(s, '08044')
    s = choose(s, 'choice.investigator', { name: 'B' })
    s = choose(s, remove ? 'choice.conduitRemove' : 'choice.conduitKeep')
    s = choose(s, 'choice.conduitHealHorror', { kind: 'horror' })
    expect(by(s, 'b').hand).toHaveLength(remove ? 2 : 1)
    expect(by(s, 'b').horror).toBe(remove ? 1 : 2)
    expect(by(s, 'b').damage).toBe(3)
    expect(by(s, 'b').leylines).toBe(remove ? 0 : 1)
  },
)
it('Blood of Thoth reacts to doom on any controlled card, including a card that already has doom', () => {
  let s = owned('11065', 0)
  s.assets.other = { ...s.assets['11065']!, id: 'other', code: 'normal', doom: 1 }
  s = run(s, { type: 'PlaceDoomOnAsset', asset: 'other', amount: 2 })
  s = choose(s, 'ability.advancedTest', { card: playerCardDef('11065')!.name })
  expect(s.assets['11065']!.uses).toBe(1)
  expect(s.assets['11065']!.exhausted).toBe(true)
})
it('Blood of Thoth consumes ALL offerings and exhausts to grant a local immediate action', () => {
  let s = owned('11065', 5)
  const a = s.assets['11065']!
  const o = playerCardBehavior('11065')!.fastOptions!(s, a)[0]!
  s = run(s, ...o.then)
  s = choose(s, 'choice.investigator', { name: 'B' })
  expect(s.assets['11065']!.uses).toBe(0)
  expect(s.assets['11065']!.exhausted).toBe(true)
  expect(s.pending?.investigator).toBe('b')
})
it('Acheron removes a line and grants the chosen investigator an actual investigate action', () => {
  let s = owned('08042')
  s = run(s, { type: 'AdjustLeylines', target: { type: 'location', id: 'C' }, amount: 1 })
  s = use(s, '08042')
  s = choose(s, 'choice.conduitTravel', { name: 'B' })
  s = choose(s, 'choice.conduitRemove')
  expect(s.pending?.investigator).toBe('b')
  expect(
    s.pending!.question.choices.every(
      (c) => c.label === 'action.investigate' || c.label === 'ability.advancedTest',
    ),
  ).toBe(true)
  expect(s.locations.C!.leylines).toBe(0)
  s = choose(s, 'action.investigate')
  expect(s.skillTest!.investigator).toBe('b')
  expect(s.skillTest!.kind.type).toBe('investigate')
  expect(by(s, 'b').actionsRemaining).toBe(0)
})
it('Good Weather chooses a skill for all investigators, enforces the group limit, and ends at the NEXT investigation phase', () => {
  let s = base()
  s.investigators[0]!.hand = ['11091']
  s = run(s, { type: 'Step', step: 'investigationBegins' })
  s = choose(s, 'ability.playCard', { card: playerCardDef('11091')!.name })
  s = choose(s, 'skill.combat')
  const a = Object.values(s.assets).find((a) => a.code === '11091')!
  expect(a.form).toBe('combat')
  expect(by(s).discard).not.toContain('11091')
  expect(playerCardBehavior('11091')!.canPlay!(s, 'b')).toBe(false)
  expect(
    playerCardBehavior('11091')!.skillAura!(s, a, { investigator: 'b', skill: 'combat' } as never),
  ).toBe(2)
  expect(
    playerCardBehavior('11091')!.skillAura!(s, a, { investigator: 'a', skill: 'agility' } as never),
  ).toBe(0)
  s = run(s, { type: 'Step', step: 'investigationBegins' })
  expect(s.assets[a.id]).toBeUndefined()
  expect(by(s).discard).toContain('11091')
})
it('I’ll take that plays an Item with the success margin discount and attaches to the EXACT new physical copy', () => {
  let s = owned('08033', 0)
  s.locations.D = { ...s.locations.C!, id: 'D', name: 'Room D' }
  s.investigators[0]!.hand = ['09067', '08033']
  const b = playerCardBehavior('09067')!
  const t = {
    type: 'afterSkillTest' as const,
    investigator: 'a',
    kind: 'investigate' as const,
    succeeded: true,
    margin: 2,
  }
  s = run(s, ...b.handReactions!(s, t, 'a')[0]!.then)
  s = choose(s, 'choice.takeCard', { card: playerCardDef('08033')!.name })
  for (const id of ['A', 'B', 'C', 'D'])
    s = choose(s, 'choice.location', { location: 'Room ' + id })
  const a = Object.values(s.assets).find((a) => a.id !== '08033' && a.code === '08033')!
  expect(a.upgrades?.map((u) => u.code)).toContain('09067')
  expect(s.assets['08033']!.upgrades).toBeUndefined()
  expect(by(s).resources).toBe(20)
  expect(by(s).discard).not.toContain('09067')
})
it('I’ll take that cannot react to failure, another investigator, non-Humanoid evasion, or an unaffordable Item', () => {
  const s = base(),
    b = playerCardBehavior('09067')!
  s.investigators[0]!.hand = ['08033']
  s.investigators[0]!.resources = 0
  s.locations.D = { ...s.locations.C!, id: 'D', name: 'Room D' }
  const t = {
    type: 'afterSkillTest' as const,
    investigator: 'a',
    kind: 'investigate' as const,
    succeeded: true,
    margin: 0,
  }
  expect(b.handReactions!(s, t, 'a')).toEqual([])
  s.investigators[0]!.resources = 5
  expect(b.handReactions!(s, { ...t, succeeded: false }, 'a')).toEqual([])
  expect(b.handReactions!(s, { ...t, investigator: 'b' }, 'a')).toEqual([])
  expect(b.handReactions!(s, { ...t, kind: 'evade', enemy: 'missing' }, 'a')).toEqual([])
})
// RR: registration and the historical inventory describe different universes.
import { allPlayerCardDefs } from '@lcg/engine'
import { isImplemented } from '../index'
import catalog from '../catalog/imports/3c8ee4b5d8100766/catalog.json'
it('registers all eight reviewed designs/levels once and removes them from the pending inventory', () => {
  const codes = ['08033', '08041', '08042', '08043', '08044', '11065', '09067', '11091']
  for (const code of codes) {
    expect(allPlayerCardDefs().filter((c) => c.code === code)).toHaveLength(1)
    expect(isImplemented(code)).toBe(true)
    expect(catalog.cards.find((c) => c.code === code)?.classification).toBe('standard-candidate')
  }
})
import { registerPlayerCard, assetTraits } from '@lcg/engine'
import { newCampaign, purchaseOptions } from '../campaign'
import { validateDeck } from '../decks'
it('research gates purchasing all four upgrades, and the shared printed title has a one-card deck limit', () => {
  const c = newCampaign('night-of-the-zealot', ['harvey'], 'standard'),
    i = c.investigators[0]!
  c.investigators[0]!.deck.push('08033')
  c.scenarioIndex = 1
  c.results = [{ scenario: 'the-gathering', outcome: { type: 'noResolution' }, xp: { [i.id]: 0 } }]
  c.log.investigators[i.id]!.xp = 20
  const codes = ['08041', '08042', '08043', '08044']
  expect(purchaseOptions(c, i.id).some((o) => codes.includes(o.code))).toBe(false)
  c.log.notes.push('identifiedGateway')
  for (const code of codes) {
    expect(purchaseOptions(c, i.id).some((o) => o.code === code)).toBe(true)
    expect(playerCardDef(code)!.deckLimit).toBe(1)
  }
  expect(
    validateDeck({
      id: 'limits',
      name: 'limits',
      investigator: '60201',
      cards: ['08041', '08042'],
    }).problems.some((p) => p.key === 'deck.problem.tooManyCopies'),
  ).toBe(true)
})
it('leyline movement and removing offerings do not spend uses or trigger abilities that watch spending', () => {
  registerPlayerCard({
    code: 'leyline-spending-observer',
    forced: (_s, t, a) =>
      t.type === 'afterUsesSpent'
        ? [{ type: 'GainResources', investigator: a.owner, amount: 99 }]
        : [],
  })
  let s = owned('08044')
  s.assets.observer = { ...s.assets['08044']!, id: 'observer', code: 'leyline-spending-observer' }
  s = run(s, ...playerCardBehavior('08044')!.fastOptions!(s, s.assets['08044']!)[0]!.then)
  s = choose(s, 'choice.investigator', { name: 'B' })
  expect(by(s).resources).toBe(20)
  expect(s.assets['08044']!.uses).toBe(3)
  s = {
    ...s,
    assets: {
      ...s.assets,
      '11065': {
        id: '11065',
        code: '11065',
        owner: 'a',
        uses: 4,
        exhausted: false,
        damage: 0,
        horror: 0,
      },
    },
  }
  s = run(s, ...playerCardBehavior('11065')!.fastOptions!(s, s.assets['11065']!)[0]!.then)
  s = choose(s, 'choice.investigator', { name: 'B' })
  expect(by(s).resources).toBe(20)
})
it('Blood of Thoth does not react to doom on scenario cards or another investigator’s controlled card', () => {
  let s = owned('11065', 0)
  s.assets.other = { ...s.assets['11065']!, id: 'other', code: 'normal', owner: 'b' }
  s = run(
    s,
    { type: 'PlaceDoom', amount: 1 },
    { type: 'PlaceDoomOnAsset', asset: 'other', amount: 1 },
  )
  expect(s.assets['11065']!.uses).toBe(0)
  expect(s.pending).toBeNull()
})
it('leylines are shared across copies and versions, while unrevealed locations are excluded from upgraded travel', () => {
  let s = owned('08033', 0)
  s = run(s, { type: 'AdjustLeylines', target: { type: 'location', id: 'C' }, amount: 2 })
  s.assets.upgrade = {
    id: 'upgrade',
    code: '08042',
    owner: 'b',
    uses: 0,
    exhausted: false,
    damage: 0,
    horror: 0,
  }
  expect(playerCardBehavior('08042')!.abilities!(s, s.assets.upgrade!, 'b')).toHaveLength(1)
  s.locations.C = { ...s.locations.C!, revealed: false }
  expect(playerCardBehavior('08042')!.abilities!(s, s.assets.upgrade!, 'b')).toEqual([])
})
it('I’ll take that grants the Illicit trait through its real attachment', () => {
  let s = base()
  s.locations.D = { ...s.locations.C!, id: 'D', name: 'Room D' }
  s.investigators[0]!.hand = ['09067', '08033']
  s = run(
    s,
    ...playerCardBehavior('09067')!.handReactions!(
      s,
      {
        type: 'afterSkillTest',
        investigator: 'a',
        kind: 'investigate',
        succeeded: true,
        margin: 2,
      },
      'a',
    )[0]!.then,
  )
  s = choose(s, 'choice.takeCard', { card: playerCardDef('08033')!.name })
  for (const id of ['A', 'B', 'C', 'D'])
    s = choose(s, 'choice.location', { location: 'Room ' + id })
  const a = Object.values(s.assets).find((a) => a.code === '08033')!
  expect(assetTraits(a)).toContain('Illicit')
})
import { registerTreachery } from '@lcg/engine'
it('Blood of Thoth also observes doom on an owned player treachery, but not other tokens', () => {
  registerTreachery({ code: 'leyline-doom-weakness', tokenKind: 'doom', revelation: () => [] })
  let s = owned('11065', 0)
  s = {
    ...s,
    treacheries: {
      weak: {
        kind: 'treachery',
        id: 'weak',
        code: 'leyline-doom-weakness',
        name: 'Weakness',
        keywords: [],
        owner: 'a',
        placement: { type: 'threatArea', investigator: 'a' },
        tokens: 1,
      },
    },
  }
  s = run(s, { type: 'AddTreacheryTokens', treachery: 'weak', amount: 1 })
  s = choose(s, 'ability.advancedTest', { card: playerCardDef('11065')!.name })
  expect(s.assets['11065']!.uses).toBe(1)
})
