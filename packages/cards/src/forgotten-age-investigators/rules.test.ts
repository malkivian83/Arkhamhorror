// RR: Investigators, Play by Effect, Take an Action, Slots, Attacks of Opportunity, Forced, Search.
import { expect, it } from 'vitest'
import {
  dispatch,
  investigatorBehavior,
  playerCardBehavior,
  playerCardDef,
  registerPlayerCards,
  registerPlayerCard,
  registerEnemy,
  type GameState,
  type Message,
} from '@lcg/engine'
import { newTestGame, throughSetup, choose, spawnAt, ghoul } from '@lcg/engine/testing'
import '../index'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const base = (code = '04001'): GameState => {
  const s = clear(throughSetup(newTestGame({ players: [code, 'b'] })))
  return {
    ...s,
    activeTurn: code,
    interactive: true,
    phase: 'investigation',
    chaosBag: [0],
    locations: Object.fromEntries(
      Object.entries(s.locations).map(([k, l]) => [k, { ...l, revealed: true, clues: 4 }]),
    ),
    investigators: s.investigators.map((i) => ({
      ...i,
      damage: 0,
      horror: 0,
      hand: [],
      deck: ['01088', '01089', '01090'],
      resources: 10,
      actionsRemaining: 3,
    })),
  }
}
const by = (s: GameState) => s.investigators[0]!
const patch = (s: GameState, v: Partial<GameState['investigators'][number]>): GameState => ({
  ...s,
  investigators: s.investigators.map((i, n) => (n === 0 ? { ...i, ...v } : i)),
})
const run = (s: GameState, ...m: Message[]) => dispatch(clear(s), ...m)
const emit = (s: GameState, trigger: Extract<Message, { type: 'Forced' }>['trigger']) =>
  run(s, { type: 'Forced', trigger })
const asset = (s: GameState, code: string, id = code): GameState => ({
  ...s,
  assets: {
    ...s.assets,
    [id]: {
      id,
      code,
      owner: by(s).id,
      uses: playerCardDef(code)?.uses?.count ?? 0,
      damage: 0,
      horror: 0,
      exhausted: false,
    },
  },
})
const done = (s: GameState) => choose(choose(s, 'choice.revealToken'), 'choice.applyResults')
const action = (s: GameState, kind: 'investigate' | 'resource') =>
  run(s, { type: 'TakeAction', investigator: by(s).id, action: { kind } })
const move = (s: GameState, location = 'B', asAction = false) =>
  run(
    s,
    asAction
      ? { type: 'TakeAction', investigator: by(s).id, action: { kind: 'move', to: location } }
      : { type: 'MoveTo', investigator: by(s).id, location },
  )
const has = (s: GameState, label: string) =>
  !!s.pending?.question.choices.some((c) => c.label === label)
it('Leo plays one legal Ally at his turn start, pays the discounted cost, and spends no action', () => {
  let s = emit(patch(base(), { hand: ['01021'] }), { type: 'turnBegins', investigator: '04001' })
  s = choose(s, 'ability.leoPlay', { card: playerCardDef('01021')!.name })
  expect(by(s).resources).toBe(8)
  expect(by(s).actionsRemaining).toBe(3)
  expect(Object.values(s.assets).some((a) => a.code === '01021')).toBe(true)
  expect(has(s, 'ability.leoPlay')).toBe(false)
})
it('Leo does not offer unaffordable allies or someone else turn, and can decline', () => {
  const s = patch(base(), { hand: ['01021'], resources: 1 }),
    t = { type: 'turnBegins' as const, investigator: '04001' }
  expect(investigatorBehavior('04001')!.reactions!(s, t, by(s))).toEqual([])
  expect(
    investigatorBehavior('04001')!.reactions!(
      patch(s, { resources: 10 }),
      { ...t, investigator: 'b' },
      by(s),
    ),
  ).toEqual([])
  const passed = choose(emit(patch(s, { resources: 10 }), t), 'choice.skip')
  expect(by(passed).hand).toContain('01021')
})
it('Leo elder sign searches only three, draws one Ally rather than playing it, and retains other cards', () => {
  const s = patch(base(), { deck: ['01021', '01018', '01088', '04006'] }),
    e = investigatorBehavior('04001')!.elderSign!(s, by(s))
  expect(e.modifier).toBe(2)
  let chosen = dispatch(clear(s), ...(e.immediate ?? []))
  expect(chosen.pending?.question.choices.some((c) => c.params?.card === 'Mitch Brown')).not.toBe(
    true,
  )
  chosen = choose(chosen, 'choice.takeCard', { card: playerCardDef('01021')!.name })
  expect(by(chosen).hand).toContain('01021')
  expect(Object.values(chosen.assets)).toHaveLength(0)
  expect(by(chosen).deck).toHaveLength(3)
})
it('Mitch uses a normal ally slot and grants two slots for non-unique allies only', () => {
  let s = run(
    base(),
    { type: 'PutAssetIntoPlay', investigator: '04001', code: '04006' },
    { type: 'PutAssetIntoPlay', investigator: '04001', code: '01021' },
    { type: 'PutAssetIntoPlay', investigator: '04001', code: '01018' },
  )
  expect(s.pending).toBeNull()
  expect(Object.values(s.assets)).toHaveLength(3)
  s = run(s, { type: 'PutAssetIntoPlay', investigator: '04001', code: '01033' })
  expect(s.pending?.question.prompt).toBe('prompt.freeSlot')
})
it('discarding Mitch removes his restricted slots and immediately checks the remaining allies', () => {
  const s = asset(asset(asset(base(), '04006'), '01021'), '01018')
  const a = Object.values(s.assets).find((a) => a.code === '04006')!
  expect(run(s, { type: 'DiscardAsset', asset: a.id }).pending?.question.prompt).toBe(
    'prompt.freeSlot',
  )
})
const blood = (s: GameState) =>
  run(patch(s, { deck: ['04007', ...by(s).deck] }), {
    type: 'DrawCards',
    investigator: by(s).id,
    amount: 1,
  })
it('Bought in Blood discards one selected Ally from play and does not shuffle back', () => {
  let s = blood(asset(base(), '01021'))
  s = choose(s, 'choice.discard', { card: playerCardDef('01021')!.name })
  expect(s.assets['01021']).toBeUndefined()
  expect(by(s).discard).toEqual(['01021', '04007'])
  expect(by(s).deck).not.toContain('04007')
})
it('Bought in Blood cannot choose an empty hand option to avoid discarding an Ally in play', () => {
  const s = blood(asset(base(), '01021'))
  expect(s.pending?.question.choices.map((c) => c.label)).toEqual(['choice.discard'])
})
registerPlayerCards([
  {
    code: 'blood-observer',
    name: 'Blood observer',
    type: 'asset',
    class: 'neutral',
    traits: [],
    cost: 0,
    xp: 0,
    icons: {},
    slots: [],
  },
])
registerPlayerCard({
  code: 'blood-observer',
  forced: (_s, t, a) =>
    t.type === 'afterHandDiscard' && t.investigator === a.owner
      ? [{ type: 'GainResources', investigator: a.owner, amount: 1 }]
      : [],
})
it('Bought in Blood discards all Ally assets from hand as a single group, preserving other cards', () => {
  let s = blood(asset(patch(base(), { hand: ['01021', '01021', '01087'] }), 'blood-observer'))
  s = choose(s, 'choice.bloodHand', { n: 2 })
  expect(by(s).hand).toEqual(['01087'])
  expect(by(s).discard.filter((c) => c === '01021')).toHaveLength(2)
  expect(by(s).resources).toBe(11)
  expect(by(s).discard).toContain('04007')
})
it('Bought in Blood shuffles itself back when there are no Ally assets in either zone', () => {
  const s = blood(base())
  expect(by(s).deck).toContain('04007')
  expect(by(s).discard).not.toContain('04007')
  expect(s.pending).toBeNull()
})
registerPlayerCards([
  {
    code: 'returning-ally',
    name: 'Returning Ally',
    type: 'asset',
    class: 'neutral',
    traits: ['Ally'],
    cost: 0,
    xp: 0,
    icons: {},
    slots: ['ally'],
  },
])
registerPlayerCard({
  code: 'returning-ally',
  leavesPlay: (_s, a, why) =>
    why === 'discard' ? [{ type: 'ReturnAssetToHand', asset: a.id }] : null,
})
it('a replacement that returns the chosen Ally does not count as a discard for Bought in Blood', () => {
  let s = blood(asset(base(), 'returning-ally'))
  s = choose(s, 'choice.discard', { card: 'Returning Ally' })
  expect(by(s).hand).toContain('returning-ally')
  expect(by(s).deck).toContain('04007')
  expect(by(s).discard).not.toContain('04007')
})
it('Ursula grants an investigate action after non-action movement, restoring the ordinary action budget', () => {
  let s = move(base('04002'))
  s = choose(s, 'ability.ursulaInvestigate')
  s = choose(s, 'action.investigate')
  s = done(s)
  expect(by(s).location).toBe('B')
  expect(by(s).clues).toBe(1)
  expect(by(s).actionsRemaining).toBe(3)
  s = move(s, 'A')
  expect(has(s, 'ability.ursulaInvestigate')).toBe(false)
})
it('Ursula may activate an investigate asset and pays its uses normally', () => {
  let s = move(asset(base('04002'), '01087'))
  s = choose(s, 'ability.ursulaInvestigate')
  s = choose(s, 'ability.investigateWith', { card: playerCardDef('01087')!.name })
  s = done(s)
  expect(s.assets['01087']?.uses).toBe(2)
  expect(by(s).actionsRemaining).toBe(3)
})
it('Ursula offers investigate events as well as basic actions and abilities', () => {
  let s = move(patch(base('04002'), { hand: ['04024', '04194'] }))
  s = choose(s, 'ability.ursulaInvestigate')
  expect(
    s.pending?.question.choices.some(
      (c) => c.label === 'action.play' && c.params?.card === playerCardDef('04024')!.name,
    ),
  ).toBe(true)
})
registerEnemy({
  code: 'jake-observer',
  forced: (_s, t, e) =>
    t.type === 'whenEnemyAttacks' && t.enemy === e.id
      ? [{ type: 'GainResources', investigator: 'b', amount: 1 }]
      : [],
})
const foe = (s: GameState) =>
  run(
    s,
    spawnAt('A', { ...ghoul, code: 'jake-observer', health: 20, damage: 0, horror: 0 }, by(s).id),
  )
const attacks = (s: GameState) => s.investigators[1]!.resources - 10
it('Ursula investigate action provokes an opportunity attack when no effect prevents it', () => {
  let s = move(foe(base('04002')))
  s = choose(s, 'ability.ursulaInvestigate')
  s = choose(s, 'action.investigate')
  expect(attacks(s)).toBe(1)
})
it('Jake protects only the first of move or investigate actions combined, not the first of each type', () => {
  let s = foe(asset(base('04002'), '04008'))
  s = action(s, 'investigate')
  s = done(s)
  expect(attacks(s)).toBe(0)
  s = move(s, 'B', true)
  expect(attacks(s)).toBe(1)
})
it('Jake entering play later does not reset a move or investigate action already performed that turn', () => {
  let s = done(action(foe(base('04002')), 'investigate'))
  expect(attacks(s)).toBe(1)
  s = move(asset(s, '04008'), 'B', true)
  expect(attacks(s)).toBe(2)
})
it('a move caused by a card effect does not consume Jake action protection', () => {
  let s = move(foe(asset(base('04002'), '04008')))
  s = choose(s, 'ability.ursulaInvestigate')
  s = choose(s, 'action.investigate')
  expect(attacks(s)).toBe(0)
})
it.each(['afterRevealLocation', 'afterPutLocation'] as const)(
  'Jake exhausts and draws for its owner %s only',
  (type) => {
    let s = emit(asset(base('04002'), '04008'), { type, investigator: '04002', location: 'B' })
    s = choose(s, 'ability.advancedTest', { card: 'Jake Williams' })
    expect(by(s).hand).toHaveLength(1)
    expect(s.assets['04008']?.exhausted).toBe(true)
    expect(
      playerCardBehavior('04008')!.reactions!(
        s,
        { type, investigator: 'b', location: 'B' },
        s.assets['04008']!,
      ),
    ).toEqual([])
  },
)
it('Ursula elder-sign movement is optional, costs no action and provokes no opportunity attack', () => {
  const s = foe(base('04002')),
    e = investigatorBehavior('04002')!.elderSign!(s, by(s))
  expect(e.modifier).toBe(1)
  let moved = choose(dispatch(clear(s), ...(e.after ?? [])), 'choice.ursulaMove')
  moved = choose(moved, 'action.move', { location: 'Room B' })
  expect(by(moved).location).toBe('B')
  expect(attacks(moved)).toBe(0)
  expect(by(moved).actionsRemaining).toBe(3)
})
const call = () =>
  run(patch(base('04002'), { deck: ['04009', '01088'] }), {
    type: 'DrawCards',
    investigator: '04002',
    amount: 1,
  })
const tid = (s: GameState) => Object.values(s.treacheries).find((t) => t.code === '04009')!.id
const select = (s: GameState) =>
  choose(emit(s, { type: 'turnBegins', investigator: '04002' }), 'choice.location', {
    location: 'Room B',
  })
it('Call of the Unknown drawn during a turn does not retroactively choose a location or punish that turn', () => {
  const s = emit(call(), { type: 'turnEnds', investigator: '04002' })
  expect(by(s).horror).toBe(0)
  expect(s.treacheries[tid(s)]).toBeDefined()
})
it('Call of the Unknown punishes failure to investigate the chosen location and shuffles back', () => {
  let s = select(call())
  const id = tid(s)
  s = emit(s, { type: 'turnEnds', investigator: '04002' })
  expect(by(s).horror).toBe(2)
  expect(by(s).deck).toContain('04009')
  expect(s.treacheries[id]).toBeUndefined()
})
it('successfully investigating the chosen location with no clues satisfies Call of the Unknown', () => {
  let s = select(call())
  s = { ...s, locations: { ...s.locations, B: { ...s.locations.B!, clues: 0 } } }
  s = run(s, {
    type: 'BeginSkillTest',
    investigator: '04002',
    skill: 'intellect',
    difficulty: 0,
    kind: { type: 'investigate', location: 'B' },
  })
  s = done(s)
  s = emit(s, { type: 'turnEnds', investigator: '04002' })
  expect(by(s).horror).toBe(0)
  expect(s.treacheries[tid(s)]?.abilityState?.success).toBe(true)
})
it('testless clue discovery does not satisfy Call of the Unknown', () => {
  let s = select(call())
  s = run(s, { type: 'DiscoverClues', investigator: '04002', location: 'B', amount: 1 })
  s = emit(s, { type: 'turnEnds', investigator: '04002' })
  expect(by(s).horror).toBe(2)
})
it('with no other location, Call of the Unknown remains in play without horror or reshuffling', () => {
  let s = call()
  s = { ...s, locations: { A: s.locations.A! } }
  s = emit(s, { type: 'turnBegins', investigator: '04002' })
  expect(s.pending).toBeNull()
  s = emit(s, { type: 'turnEnds', investigator: '04002' })
  expect(by(s).horror).toBe(0)
  expect(s.treacheries[tid(s)]).toBeDefined()
})
it('Call of the Unknown remembers its chosen location and success state across JSON serialization', () => {
  let s = JSON.parse(JSON.stringify(select(call()))) as GameState
  expect(s.treacheries[tid(s)]?.abilityState?.location).toBe('B')
  s = emit(s, { type: 'turnEnds', investigator: '04002' })
  expect(by(s).horror).toBe(2)
})

it('Call of the Unknown resolves at the real end of the chosen turn', () => {
  let s = run(call(), { type: 'BeginTurn', investigator: '04002' })
  s = choose(s, 'choice.location', { location: 'Room B' })
  s = run(s, { type: 'EndTurn', investigator: '04002' })
  expect(by(s).horror).toBe(2)
  expect(by(s).deck).toContain('04009')
})
it.each([
  { location: 'A', difficulty: 0 },
  { location: 'B', difficulty: 10 },
])(
  'Call is not satisfied by success elsewhere or failure at its target: $location/$difficulty',
  ({ location, difficulty }) => {
    let s = select(call())
    s = run(s, {
      type: 'BeginSkillTest',
      investigator: '04002',
      skill: 'intellect',
      difficulty,
      kind: { type: 'investigate', location },
    })
    s = done(s)
    s = emit(s, { type: 'turnEnds', investigator: '04002' })
    expect(by(s).horror).toBe(2)
  },
)
it('Jake protection starts again on a new actual turn, while resource actions do not consume it', () => {
  let s = foe(asset(base('04002'), '04008'))
  s = action(s, 'resource')
  expect(attacks(s)).toBe(1)
  s = done(action(s, 'investigate'))
  expect(attacks(s)).toBe(1)
  s = run(s, { type: 'BeginTurn', investigator: '04002' })
  s = done(action(s, 'investigate'))
  expect(attacks(s)).toBe(1)
})
