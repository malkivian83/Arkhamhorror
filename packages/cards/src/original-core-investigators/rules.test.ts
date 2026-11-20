// RR: Investigators, Triggered Abilities, Additional Actions, Weaknesses and Costs.
import { expect, it } from 'vitest'
import {
  dispatch,
  investigatorBehavior,
  playerCardBehavior,
  treacheryBehavior,
  playerCardDef,
  availableAbilities,
  availableActions,
  withinLimit,
  type GameState,
  type Message,
} from '@lcg/engine'
import { newTestGame, throughSetup, choose, spawnAt, ghoul } from '@lcg/engine/testing'
import '../index'
const clear = (s: GameState): GameState => ({ ...s, queue: [], pending: null })
const base = (code = '01001'): GameState => {
  const s = clear(throughSetup(newTestGame({ players: [code, 'b'] })))
  return {
    ...s,
    activeTurn: code,
    interactive: true,
    phase: 'investigation',
    chaosBag: [0],
    locations: Object.fromEntries(
      Object.entries(s.locations).map(([id, l]) => [id, { ...l, clues: 4, revealed: true }]),
    ),
    investigators: s.investigators.map((i) => ({
      ...i,
      actionsRemaining: 3,
      resources: 10,
      hand: [],
      deck: ['12090', '12090', '12090', '12090'],
      horror: 0,
      damage: 0,
    })),
  }
}
const by = (s: GameState, id = s.investigators[0]!.id) => s.investigators.find((i) => i.id === id)!
const run = (s: GameState, ...m: Message[]) => dispatch(clear(s), ...m)
const asset = (s: GameState, code: string, horror = 0): GameState => ({
  ...s,
  assets: {
    ...s.assets,
    [code]: { id: code, code, owner: by(s).id, uses: 4, exhausted: false, damage: 0, horror },
  },
})
const emit = (s: GameState, trigger: Extract<Message, { type: 'Forced' }>['trigger']) =>
  run(s, { type: 'Forced', trigger })
const use = (s: GameState, code: string) => {
  const a = s.assets[code]!,
    o = playerCardBehavior(code)!.abilities!(s, a, by(s).id)[0]!
  return run(s, { type: 'UseAbility', investigator: by(s).id, ...o })
}
const has = (s: GameState, label: string) =>
  s.pending?.question.choices.some((c) => c.label === label)
const reveal = (s: GameState) => {
  for (let n = 0; n < 5 && has(s, 'choice.revealToken'); n++) s = choose(s, 'choice.revealToken')
  return s
}
const finish = (s: GameState) =>
  has(s, 'choice.applyResults') ? choose(s, 'choice.applyResults') : s
const effectTest = (s: GameState, difficulty = 1) =>
  run(s, {
    type: 'BeginSkillTest',
    investigator: by(s).id,
    skill: 'willpower',
    difficulty,
    kind: { type: 'effect', source: 'Probe', onSuccess: [], onFail: [], onFailEach: [] },
  })
it('Roland discovers at his current location once per round after his own defeat', () => {
  let s = base()
  const enemy = {
    ...ghoul,
    id: 'g',
    maxHealth: ghoul.health,
    location: 'A',
    engagedWith: null,
    exhausted: false,
    damageTaken: 0,
  }
  s = emit(s, { type: 'enemyDefeated', enemy, by: '01001' })
  s = choose(s, 'ability.originalRoland')
  expect(by(s).clues).toBe(1)
  s = emit(s, { type: 'enemyDefeated', enemy, by: '01001' })
  expect(has(s, 'ability.originalRoland')).toBeFalsy()
  expect(
    investigatorBehavior('01001')!.reactions!(s, { type: 'enemyDefeated', enemy, by: 'b' }, by(s)),
  ).toEqual([])
  expect(investigatorBehavior('01001')!.elderSign!(s, by(s)).modifier).toBe(3)
})
it.each([0, 2])('Roland’s Special gives +1 or +3 with %i local clues and spends ammo', (clues) => {
  let s = asset(base(), '01006')
  s = { ...s, locations: { ...s.locations, A: { ...s.locations.A!, clues } } }
  s = run(s, spawnAt('A', { ...ghoul, health: 8 }, '01001'))
  s = use(s, '01006')
  expect(s.assets['01006']!.uses).toBe(3)
  expect(s.skillTest!.baseModifier).toBe(clues ? 3 : 1)
  s = finish(reveal(s))
  expect(Object.values(s.enemies)[0]!.damageTaken).toBe(2)
})
it('Cover Up replaces discovery, retains the location clues, and stops penalizing when empty', () => {
  let s = run(base(), { type: 'ResolveWeakness', investigator: '01001', code: '01007' })
  const t = Object.values(s.treacheries)[0]!
  expect(t.tokens).toBe(3)
  s = run(s, { type: 'DiscoverClues', investigator: '01001', amount: 2 })
  s = choose(s, 'ability.originalCoverUp')
  expect(s.treacheries[t.id]!.tokens).toBe(1)
  expect(by(s).clues).toBe(0)
  expect(s.locations.A!.clues).toBe(4)
  expect(treacheryBehavior('01007')!.whenGameEnds!(s, s.treacheries[t.id]!)).toEqual([
    { type: 'SufferTrauma', investigator: '01001', mental: 1 },
  ])
  s = run(s, { type: 'DiscoverClues', investigator: '01001', amount: 2 })
  s = choose(s, 'ability.originalCoverUp')
  expect(s.treacheries[t.id]!.tokens).toBe(0)
  expect(treacheryBehavior('01007')!.whenGameEnds!(s, s.treacheries[t.id]!)).toEqual([])
  s = run(s, { type: 'DiscoverClues', investigator: '01001', amount: 1 })
  expect(by(s).clues).toBe(1)
})
it('Daisy’s restricted extra action activates a Tome but cannot play one', () => {
  let s = asset(base('01002'), '01031')
  by(s).actionsRemaining = 0
  by(s).hand = ['01031']
  expect(availableActions(s, '01002').some((a) => a.kind === 'play')).toBe(false)
  const o = availableAbilities(s, '01002').find((o) => o.key.startsWith('01031:'))!
  expect(o).toBeDefined()
  s = run(s, { type: 'UseAbility', investigator: '01002', ...o })
  expect(by(s).traitActionUsed).toBe(true)
  expect(by(s).actionsRemaining).toBe(0)
})
it('Daisy elder sign draws once for each controlled Tome, on success only', () => {
  const s = asset(asset(base('01002'), '01031'), '01009', 3),
    e = investigatorBehavior('01002')!.elderSign!(s, by(s))
  expect(e.modifier).toBe(0)
  expect(run(s, ...e.onSuccess!).investigators[0]!.hand).toHaveLength(2)
  expect(e.onFail).toBeUndefined()
})
it('Daisy’s Tote Bag provides two hand slots only for Tomes', () => {
  expect(playerCardBehavior('01008')!.restrictedSlots).toEqual([
    { slot: 'hand', count: 2, trait: 'Tome' },
  ])
})
it('Necronomicon enters with three horror and occupies its hand slot', () => {
  const s = run(base('01002'), { type: 'ResolveWeakness', investigator: '01002', code: '01009' }),
    a = Object.values(s.assets).find((a) => a.code === '01009')!
  expect(a.horror).toBe(3)
  expect(playerCardDef(a.code)!.slots).toEqual(['hand'])
  expect(playerCardBehavior(a.code)!.cannotLeavePlay!(s, a)).toBe(true)
  const kept = run(s, { type: 'DiscardAsset', asset: a.id })
  expect(kept.assets[a.id]).toBeDefined()
})
it('Necronomicon moves horror without dealing it, then discards after the third action', () => {
  let s = asset(base('01002'), '01009', 3)
  for (let n = 1; n <= 3; n++) {
    s = use(s, '01009')
    expect(by(s).horror).toBe(n)
    expect(by(s).actionsRemaining).toBe(3 - Math.max(0, n - 1))
  }
  expect(s.assets['01009']).toBeUndefined()
  expect(by(s).discard).toContain('01009')
})
it('Necronomicon treats an elder sign as automatic failure before Daisy resolves it', () => {
  let s = asset(base('01002'), '01009', 3)
  s.chaosBag = ['elderSign']
  s = reveal(effectTest(s))
  expect(s.skillTest!.autoFail).toBe(true)
  expect(s.skillTest!.tokens).toEqual(['autoFail'])
})
it('Skids pays two resources for one action and is limited to his own turn', () => {
  let s = base('01003')
  const b = investigatorBehavior('01003')!,
    o = b.fastOptions!(s, by(s))[0]!
  s = run(s, { type: 'UseAbility', ...o, actions: 0, provokes: false })
  expect(by(s).resources).toBe(8)
  expect(by(s).actionsRemaining).toBe(4)
  expect(withinLimit(s, o.key, '01003', o.limit)).toBe(false)
  expect(b.fastOptions!({ ...s, activeTurn: 'b' }, by(s))).toEqual([])
  expect(b.elderSign!(s, by(s))).toMatchObject({
    modifier: 2,
    onSuccess: [{ type: 'GainResources', amount: 2 }],
  })
})
it('On the Lam is offered only just after its controller’s turn begins', () => {
  let s = base('01003')
  by(s).hand = ['01010']
  expect(playerCardBehavior('01010')!.canPlay!(s, '01003')).toBe(false)
  s = emit(s, { type: 'turnBegins', investigator: '01003' })
  s = choose(s, 'ability.playCard', { card: playerCardDef('01010')!.name })
  expect(by(s).attackProtection?.untilRoundEnd).toBe(true)
  expect(by(s).resources).toBe(9)
})
it.each(['enemy', 'upkeep'] as const)(
  'On the Lam prevents non-Elite attacks in later %s phase, but not Elite ones or next-round attacks',
  (phase) => {
    let s = run(base('01003'), spawnAt('A', { ...ghoul, health: 8 }, '01003'), {
      type: 'ProtectFromAttacks',
      investigator: '01003',
      nonElite: true,
      untilRoundEnd: true,
    })
    const id = Object.keys(s.enemies)[0]!
    s.phase = phase
    s = run(s, { type: 'EnemyAttack', investigator: '01003', enemy: id, exhaustAfter: false })
    expect(by(s).damage).toBe(0)
    s.enemies[id]!.traits = ['Elite']
    s = run(s, { type: 'EnemyAttack', investigator: '01003', enemy: id, exhaustAfter: false })
    expect(by(s).damage).toBeGreaterThan(0)
    by(s).damage = 0
    s.enemies[id]!.traits = []
    s.round++
    s = run(s, { type: 'EnemyAttack', investigator: '01003', enemy: id, exhaustAfter: false })
    expect(by(s).damage).toBeGreaterThan(0)
  },
)
it('Hospital Debts permits exactly two payments per round and penalizes fewer than six', () => {
  let s = run(base('01003'), { type: 'ResolveWeakness', investigator: '01003', code: '01011' })
  const t = Object.values(s.treacheries)[0]!
  for (let n = 0; n < 2; n++) {
    const o = availableAbilities(s, '01003').find((o) => o.key === t.id + ':pay')!
    expect(o).toBeDefined()
    s = run(s, { type: 'UseAbility', investigator: '01003', ...o })
  }
  expect(availableAbilities(s, '01003').some((o) => o.key === t.id + ':pay')).toBe(false)
  expect(s.treacheries[t.id]!.tokens).toBe(2)
  expect(by(s).resources).toBe(8)
  expect(treacheryBehavior('01011')!.whenGameEnds!(s, { ...t, tokens: 5 })).toMatchObject([
    { type: 'EarnExperience', amount: -2 },
  ])
  expect(treacheryBehavior('01011')!.whenGameEnds!(s, { ...t, tokens: 6 })).toEqual([])
  s.round++
  expect(availableAbilities(s, '01003').some((o) => o.key === t.id + ':pay')).toBe(true)
})
it('Agnes reacts to horror actually placed on her once per phase', () => {
  let s = run(base('01004'), spawnAt('A', { ...ghoul, health: 8 }, '01004'))
  s = run(s, { type: 'TakeDamage', investigator: '01004', damage: 0, horror: 2, direct: true })
  s = choose(s, 'ability.originalAgnes')
  if (has(s, 'choice.enemy')) s = choose(s, 'choice.enemy')
  expect(Object.values(s.enemies)[0]!.damageTaken).toBe(1)
  s = run(s, { type: 'TakeDamage', investigator: '01004', damage: 0, horror: 1, direct: true })
  expect(has(s, 'ability.originalAgnes')).toBeFalsy()
  expect(investigatorBehavior('01004')!.elderSign!(s, by(s)).modifier).toBe(3)
})
it('Agnes cannot trigger from horror soaked by an asset or placed on someone else', () => {
  const s = base('01004'),
    b = investigatorBehavior('01004')!
  expect(
    b.reactions!(s, { type: 'afterHorrorPlaced', investigator: 'b', amount: 1 }, by(s)),
  ).toEqual([])
  const t = {
    type: 'afterDamageAssigned' as const,
    investigator: '01004',
    dealt: [{ asset: 'rosary', damage: 0, horror: 1 }],
  }
  const n = emit(s, t)
  expect(has(n, 'ability.originalAgnes')).toBeFalsy()
})
it('Moving horror onto Agnes triggers her ability without a damage assignment', () => {
  let s = asset(run(base('01004'), spawnAt('A', { ...ghoul, health: 8 }, '01004')), '01060', 1)
  s = run(s, {
    type: 'MoveDamage',
    from: { type: 'asset', id: '01060' },
    to: { type: 'investigator', id: '01004' },
    kind: 'horror',
  })
  expect(has(s, 'ability.originalAgnes')).toBe(true)
  expect(by(s).horror).toBe(1)
})
it('Heirloom draws after any Spell card is played, not an activation or a non-Spell', () => {
  let s = asset(base('01004'), '01012')
  s = emit(s, { type: 'afterPlayCard', investigator: '01004', code: '01060' })
  s = choose(s, 'ability.advancedTest', { card: playerCardDef('01012')!.name })
  expect(by(s).hand).toHaveLength(1)
  expect(
    playerCardBehavior('01012')!.reactions!(
      s,
      { type: 'afterPlayCard', investigator: '01004', code: '01087' },
      s.assets['01012']!,
    ),
  ).toEqual([])
})
it('Dark Memory places doom and checks advancement when played', () => {
  expect(playerCardBehavior('01013')!.play!(base('01004'), '01004')).toEqual([
    { type: 'PlaceDoom', amount: 1 },
    { type: 'CheckAgenda' },
  ])
})
it('Dark Memory forces horror at its owner’s turn end only while held', () => {
  let s = base('01004')
  by(s).hand = ['01013']
  s = emit(s, { type: 'turnEnds', investigator: 'b' })
  expect(by(s).horror).toBe(0)
  s = emit(s, { type: 'turnEnds', investigator: '01004' })
  expect(by(s).horror).toBe(2)
  by(s).hand = []
  s = emit(s, { type: 'turnEnds', investigator: '01004' })
  expect(by(s).horror).toBe(2)
})
// RR: Weakness events stay in hand until played; playing pays printed cost.
it('Playing Dark Memory pays its printed cost, discards it and avoids its end-turn horror', () => {
  let s = base('01004')
  by(s).hand = ['01013']
  const printed = playerCardDef('01013')!.cost!
  s = run(s, { type: 'PlayCard', investigator: '01004', code: '01013' })
  expect(by(s).resources).toBe(10 - printed)
  expect(by(s).hand).not.toContain('01013')
  expect(by(s).discard).toContain('01013')
  s = emit(s, { type: 'turnEnds', investigator: '01004' })
  expect(by(s).horror).toBe(0)
})
it('Daisy counts Tomes when the successful elder-sign effect resolves', () => {
  let s = asset(asset(base('01002'), '01031'), '01009', 3)
  const e = investigatorBehavior('01002')!.elderSign!(s, by(s))
  delete s.assets['01031']
  s = run(s, ...e.onSuccess!)
  expect(by(s).hand).toHaveLength(1)
})
