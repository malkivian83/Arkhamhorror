// RR: Enemy Attacks, Attacks of Opportunity, Direct Damage, Movement, Investigate, Costs, Deckbuilding.
import { expect, it } from 'vitest'
import {
  availableAbilities,
  availableActions,
  dispatch,
  investigatorBehavior,
  playerCardBehavior,
  playerCardDef,
  registerScenario,
  registerTreachery,
  scenarioBehavior,
  type GameState,
  type Investigator,
  type Message,
} from '@lcg/engine'
import { choose, ghoul, newTestGame, spawnAt, throughSetup } from '@lcg/engine/testing'
import '../index'
const me = (s: GameState) => s.investigators[0]!
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const patch = (s: GameState, p: Partial<Investigator>): GameState => ({
  ...s,
  investigators: s.investigators.map((i, n) => (n ? i : { ...i, ...p })),
})
const run = (s: GameState, ...m: Message[]) => dispatch(clear(s), ...m)
const has = (s: GameState, label: string) =>
  !!s.pending?.question.choices.some((c) => c.label === label)
const results = (s: GameState) =>
  has(s, 'choice.applyResults') ? choose(s, 'choice.applyResults') : s
function game(code = '08001') {
  const s = clear(throughSetup(newTestGame({ players: [code, 'b'] }))),
    d = playerCardDef(code)!
  return patch(
    {
      ...s,
      interactive: true,
      activeTurn: code,
      phase: 'investigation',
      chaosBag: [0],
      locations: Object.fromEntries(
        Object.entries(s.locations).map(([id, l]) => [id, { ...l, revealed: true }]),
      ),
    },
    {
      skills: d.skills!,
      health: d.health!,
      sanity: d.sanity!,
      hand: [],
      discard: [],
      deck: ['01088', '01087', '01089'],
      resources: 10,
      actionsRemaining: 3,
      damage: 0,
      horror: 0,
    },
  )
}
const put = (s: GameState, code: string) =>
  run(s, { type: 'PutAssetIntoPlay', investigator: me(s).id, code })
const foe = (s = game(), at = 'A') => run(s, spawnAt(at, { ...ghoul, health: 8 }, null))
const enemy = (s: GameState) => Object.values(s.enemies)[0]!
const attack = (s: GameState, extra: Partial<Extract<Message, { type: 'EnemyAttack' }>> = {}) =>
  run(s, {
    type: 'EnemyAttack',
    enemy: enemy(s).id,
    investigator: me(s).id,
    exhaustAfter: false,
    ...extra,
  })
const respond = (s: GameState, label = 'choice.danielaDamage') =>
  choose(choose(s, 'ability.danielaRespond'), label)
const begin = (s: GameState) =>
  run(s, {
    type: 'BeginSkillTest',
    investigator: me(s).id,
    skill: 'intellect',
    difficulty: 2,
    kind: { type: 'investigate', location: me(s).location! },
  })

it('Daniela takes an ordinary attack then deals one damage without a round limit', () => {
  let s = respond(attack(foe()))
  expect(me(s)).toMatchObject({ damage: 1, horror: 1 })
  expect(enemy(s).damageTaken).toBe(1)
  s = respond(attack(s))
  expect(enemy(s).damageTaken).toBe(2)
})
it('Daniela can automatically evade the attacker even if it is not engaged with her', () => {
  let s = foe()
  s = { ...s, enemies: { [enemy(s).id]: { ...enemy(s), engagedWith: 'b' } } }
  s = respond(attack(s), 'choice.danielaEvade')
  expect(enemy(s)).toMatchObject({ exhausted: true, engagedWith: null })
})
it('Daniela reacts after a canceled attack and still records it for her elder sign and wrench', () => {
  let s = foe()
  s = run(s, {
    type: 'ProtectFromAttacks',
    investigator: '08001',
    nonElite: false,
    untilRoundEnd: true,
  })
  s = respond(attack(s))
  expect(me(s)).toMatchObject({ damage: 0, horror: 0, enemiesAttackedSinceTurnEnd: [enemy(s).id] })
  expect(investigatorBehavior('08001')!.elderSign!(s, me(s)).autoSucceed).toBe(true)
})
it('Daniela does not react to her own opportunity attack or another investigator being attacked', () => {
  expect(has(attack(foe(), { opportunity: true }), 'ability.danielaRespond')).toBe(false)
  expect(has(attack(foe(), { investigator: 'b' }), 'ability.danielaRespond')).toBe(false)
})
it('Daniela elder sign gives +1 before being attacked, then automatic success including an opportunity attack', () => {
  let s = game()
  expect(investigatorBehavior('08001')!.elderSign!(s, me(s))).toEqual({ modifier: 1 })
  s = attack(foe(s), { opportunity: true })
  s = begin({ ...s, chaosBag: ['elderSign'] })
  s = results(choose(s, 'choice.revealToken'))
  expect(me(s).clues).toBe(1)
  s = { ...s, round: s.round + 1 }
  expect(investigatorBehavior('08001')!.elderSign!(s, me(s))).toEqual({ modifier: 1 })
})
it('Wrench can exhaust to provoke even an exhausted enemy, unlocking its +2 combat/+1 damage attack', () => {
  let s = put(foe(), '08002')
  const a = Object.values(s.assets).find((a) => a.code === '08002')!
  expect(availableAbilities(s, '08001').some((o) => o.key === a.id + ':fight')).toBe(false)
  s = { ...s, enemies: { [enemy(s).id]: { ...enemy(s), exhausted: true } } }
  s = respond(run(s, ...playerCardBehavior('08002')!.fastOptions!(s, a)[0]!.then))
  expect(s.assets[a.id]!.exhausted).toBe(true)
  const fight = availableAbilities(s, '08001').find((o) => o.key === a.id + ':fight')!
  s = run(s, ...fight.then)
  expect(s.skillTest).toMatchObject({ baseModifier: 2, kind: { type: 'fight', extraDamage: 1 } })
  s = results(choose(s, 'choice.revealToken'))
  expect(enemy(s).damageTaken).toBe(3)
})
it('Wrench remembers attacks across rounds and loses permission only after its controller’s own turn ends', () => {
  let s = put(foe(), '08002')
  const a = Object.values(s.assets).find((a) => a.code === '08002')!
  s = respond(attack(s))
  s = { ...s, round: s.round + 1 }
  expect(availableAbilities(s, '08001').some((o) => o.key === a.id + ':fight')).toBe(true)
  s = run(s, { type: 'EndTurn', investigator: 'b' })
  expect(me(s).enemiesAttackedSinceTurnEnd).toContain(enemy(s).id)
  s = run(s, { type: 'EndTurn', investigator: '08001' })
  expect(me(s).enemiesAttackedSinceTurnEnd).toEqual([])
})

it('Wrench does not offer an enemy whose attacks are prohibited by an attachment or suppression', () => {
  const s = put(foe(), '08002'),
    a = Object.values(s.assets).find((a) => a.code === '08002')!,
    e = enemy(s)
  const options = (state: GameState) => playerCardBehavior('08002')!.fastOptions!(state, a)
  expect(options(s)).toHaveLength(1)
  registerTreachery({ code: 'lot170-bound', revelation: () => [], attachedEnemyCannotAttack: true })
  expect(
    options({
      ...s,
      treacheries: {
        bound: {
          kind: 'treachery',
          code: 'lot170-bound',
          id: 'bound',
          name: 'Bound',
          traits: [],
          keywords: [],
          placement: { type: 'enemy', enemy: e.id },
        },
      },
    }),
  ).toEqual([])
  expect(options({ ...s, enemies: { [e.id]: { ...e, noAttackAnyPhaseRound: s.round } } })).toEqual(
    [],
  )
})
it('Mob Goons cannot be canceled and its damage and horror cannot be assigned to ordinary assets', () => {
  let s = put(game(), '01521')
  s = run(s, { type: 'ResolveWeakness', investigator: '08001', code: '08003' })
  expect(enemy(s)).toMatchObject({
    fight: 3,
    maxHealth: 3,
    evade: 3,
    keywords: ['hunter'],
    prey: { type: 'only', investigator: '08001' },
  })
  s = run(s, {
    type: 'ProtectFromAttacks',
    investigator: '08001',
    nonElite: false,
    untilRoundEnd: true,
  })
  s = attack(s)
  expect(me(s)).toMatchObject({ damage: 1, horror: 1 })
  expect(Object.values(s.assets)[0]).toMatchObject({ damage: 0, horror: 0 })
})
it('Get behind me redirects another investigator’s opportunity attack, reduces horror, allows Daniela’s response and then engages', () => {
  let s = foe(patch(game(), { hand: ['08021'] }))
  s = run(s, { type: 'PlayCard', investigator: '08001', code: '08021', asFast: true })
  s = respond(attack(s, { investigator: 'b', opportunity: true }))
  expect(me(s)).toMatchObject({ damage: 1, horror: 0 })
  expect(s.investigators[1]!).toMatchObject({ damage: 0, horror: 0 })
  expect(enemy(s)).toMatchObject({ damageTaken: 1, engagedWith: '08001' })
})
it('Get behind me follows the protector’s current location and expires with the phase', () => {
  let s = foe(patch(game(), { hand: ['08021'] }))
  s = run(s, { type: 'PlayCard', investigator: '08001', code: '08021', asFast: true })
  s = patch(s, { location: 'B' })
  s = attack(s, { investigator: 'b' })
  expect(me(s).damage).toBe(0)
  expect(s.investigators[1]!.damage).toBe(1)
  s = patch({ ...s, phase: 'enemy' }, { location: 'A' })
  s = attack(s, { investigator: 'b' })
  expect(me(s).damage).toBe(0)
  expect(s.investigators[1]!.damage).toBe(2)
})

it('Get behind me retains its horror cancellation if Self-Sacrifice redirects that attack again', () => {
  let s = foe(patch(game(), { hand: ['08021'] }))
  s = {
    ...s,
    enemies: { [enemy(s).id]: { ...enemy(s), horror: 2 } },
    investigators: s.investigators.map((i) =>
      i.id === 'b' ? { ...i, hand: ['06234'], resources: 5 } : i,
    ),
  }
  s = run(s, { type: 'PlayCard', investigator: '08001', code: '08021', asFast: true })
  s = attack(s, { investigator: 'b' })
  s = choose(s, 'ability.playCard', { card: playerCardDef('06234')!.name })
  expect(s.investigators[1]!.horror).toBe(1)
  expect(me(s).horror).toBe(0)
})

it('Wrench history remains available to a living controller after Daniela is eliminated', () => {
  let s = foe()
  s = {
    ...s,
    investigators: s.investigators.map((i) => (i.id === '08001' ? { ...i, eliminated: true } : i)),
  }
  s = attack(s, { investigator: 'b' })
  expect(s.investigators[1]!.enemiesAttackedSinceTurnEnd).toContain(enemy(s).id)
})
it.each([
  ['A', 0],
  ['B', 1],
  ['C', 2],
] as const)('Monterey rewards shortest-path distance at %s, not moves made', (location, d) => {
  let s = game('08007')
  s = run(s, { type: 'Forced', trigger: { type: 'roundBegins' } })
  s = patch(s, { location })
  s = run(s, { type: 'Forced', trigger: { type: 'turnEnds', investigator: '08007' } })
  if (d === 0) {
    expect(has(s, 'ability.montereyTravel')).toBe(false)
    return
  }
  s = choose(s, 'ability.montereyTravel')
  if (d === 1) s = choose(s, 'choice.montereyResource')
  expect(me(s).resources).toBe(11)
  expect(me(s).hand).toHaveLength(d === 2 ? 1 : 0)
})
it('Monterey resets his round origin and offers either elder-sign reward only at positive distance', () => {
  let s = game('08007')
  s = run(s, { type: 'Forced', trigger: { type: 'roundBegins' } })
  expect(investigatorBehavior('08007')!.elderSign!(s, me(s)).immediate).toEqual([])
  s = patch(s, { location: 'B' })
  s = choose(
    run(s, ...investigatorBehavior('08007')!.elderSign!(s, me(s)).immediate!),
    'choice.montereyDraw',
  )
  expect(me(s).hand).toHaveLength(1)
  s = { ...s, round: s.round + 1 }
  s = run(s, { type: 'Forced', trigger: { type: 'roundBegins' } })
  expect(me(s).abilityState).toMatchObject({ montereyOrigin: 'B', montereyRound: s.round })
  expect(investigatorBehavior('08007')!.elderSign!(s, me(s)).immediate).toEqual([])
})
it.each(['choice.whipDamage', 'choice.whipEvade'])(
  'Bullwhip attacks with agility and exhausts for %s',
  (label) => {
    let s = put(foe(game('08007')), '08008')
    const a = Object.values(s.assets).find((a) => a.code === '08008')!
    s = run(s, ...availableAbilities(s, '08007').find((o) => o.key === a.id + ':fight')!.then)
    expect(s.skillTest!.skill).toBe('agility')
    s = results(choose(s, 'choice.revealToken'))
    s = choose(s, label)
    expect(enemy(s).damageTaken).toBe(label === 'choice.whipDamage' ? 2 : 1)
    expect(enemy(s).exhausted).toBe(label === 'choice.whipEvade')
    expect(s.assets[a.id]!.exhausted).toBe(true)
  },
)
it('Buried Secrets is placed by revelation and blocks basic/card movement even at a location without clues', () => {
  let s = game('08007')
  s = run(s, { type: 'ResolveWeakness', investigator: '08007', code: '08009' })
  s = { ...s, locations: { ...s.locations, A: { ...s.locations.A!, clues: 0 } } }
  expect(availableActions(s, '08007').some((a) => a.kind === 'move')).toBe(false)
  expect(me(run(s, { type: 'MoveTo', investigator: '08007', location: 'B' })).location).toBe('A')
  expect(
    me(run(s, { type: 'MoveTo', investigator: '08007', location: 'B', encounterEffect: true }))
      .location,
  ).toBe('B')
})
it('Buried Secrets permits movement when investigation is forbidden and scenario abilities retain their movement provenance', () => {
  const s = run(game('08007'), { type: 'ResolveWeakness', investigator: '08007', code: '08009' })
  registerScenario({ id: 'lot170-cannot-investigate', cannotInvestigate: () => true })
  expect(
    me(
      run(
        { ...s, scenarioId: 'lot170-cannot-investigate' },
        { type: 'MoveTo', investigator: '08007', location: 'B' },
      ),
    ).location,
  ).toBe('B')
  registerScenario({
    id: 'lot170-forced-move',
    forced: () => [{ type: 'MoveTo', investigator: '08007', location: 'B' }],
  })
  const effect = scenarioBehavior('lot170-forced-move')!.forced!(s, { type: 'roundBegins' })
  expect(effect[0]).toMatchObject({ encounterEffect: true })
  expect(me(run(s, ...effect)).location).toBe('B')
})

it('Buried Secrets checks the physical departure location when an effect is resolving as if elsewhere', () => {
  let s = run(game('08007'), { type: 'ResolveWeakness', investigator: '08007', code: '08009' })
  registerScenario({
    id: 'lot170-virtual',
    cannotInvestigate: (_s, _by, location) => location === 'B',
  })
  s = run(
    { ...s, scenarioId: 'lot170-virtual' },
    {
      type: 'AsIfAt',
      investigator: '08007',
      location: 'B',
      then: [
        {
          type: 'BeginSkillTest',
          investigator: '08007',
          skill: 'willpower',
          difficulty: 1,
          kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
        },
      ],
    },
  )
  expect(me(s).location).toBe('B')
  expect(availableActions(s, '08007').some((a) => a.kind === 'move')).toBe(false)
})
it('Buried Secrets is investigated by a helper without gaining clues, and success discards the owner’s weakness', () => {
  let s = run(game('08007'), { type: 'ResolveWeakness', investigator: '08007', code: '08009' })
  s = {
    ...s,
    activeTurn: 'b',
    investigators: s.investigators.map((i) =>
      i.id === 'b' ? { ...i, hand: [], actionsRemaining: 3 } : i,
    ),
  }
  const t = Object.values(s.treacheries)[0]!,
    o = availableAbilities(s, 'b').find((o) => o.key === t.id + ':investigate')!
  s = run(s, ...o.then)
  s = results(choose(s, 'choice.revealToken'))
  expect(s.treacheries[t.id]).toBeUndefined()
  expect(me(s).discard).toContain('08009')
  expect(s.investigators[1]!.clues).toBe(0)
})
it.each(['normal', 'prevented', 'asset'])(
  'Buried Secrets shuffles into its owner’s deck only after two horror are dealt (%s)',
  (mode) => {
    const prevented = mode === 'prevented'
    let s = run(game('08007'), { type: 'ResolveWeakness', investigator: '08007', code: '08009' })
    s = {
      ...s,
      chaosBag: ['autoFail'],
      activeTurn: 'b',
      investigators: s.investigators.map((i) =>
        i.id === 'b' ? { ...i, hand: [], actionsRemaining: 3 } : i,
      ),
    }
    if (prevented) {
      registerScenario({ id: 'lot170-prevent-horror', beforeDamage: () => [] })
      s = { ...s, scenarioId: 'lot170-prevent-horror' }
    }
    if (mode === 'asset') s = run(s, { type: 'PutAssetIntoPlay', investigator: 'b', code: '01521' })
    const t = Object.values(s.treacheries)[0]!,
      o = availableAbilities(s, 'b').find((o) => o.key === t.id + ':investigate')!
    s = run(s, ...o.then)
    s = results(choose(s, 'choice.revealToken'))
    s = choose(s, 'choice.buriedHorror')
    if (mode === 'asset')
      s = choose(s, 'choice.assignToAsset', { card: playerCardDef('01521')!.name })
    expect(s.investigators[1]!.horror).toBe(prevented ? 0 : mode === 'asset' ? 1 : 2)
    expect(me(s).deck.includes('08009')).toBe(!prevented)
    expect(!!s.treacheries[t.id]).toBe(prevented)
  },
)
