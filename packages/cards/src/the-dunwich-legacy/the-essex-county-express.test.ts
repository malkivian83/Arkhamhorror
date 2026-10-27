import {
  applyInput,
  availableAbilities,
  availableActions,
  createGame,
  emptyCampaignLog,
  getInvestigator,
  scenarioBehavior,
  type Difficulty,
  type GameState,
  type Message,
  type EnemyCard,
} from '@lcg/engine'
import { choose, during, keep, testInvestigator, throughSetup, spawnAt } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import '../index'
import { newCampaign, startScenario, finishScenario, currentScenario } from '../campaign'
import { playRandomlyToEnd } from '../scenario-testing'
import {
  theEssexCountyExpress,
  T,
  TN,
  ESSEX_LOCATIONS,
  ESSEX_ENCOUNTERS,
} from './the-essex-county-express'
import { trainCars } from './essex-helpers'
import { M } from './museum-codes'
import { H, HN } from './house-codes'
import { EA, DUNWICH_NOTES as N } from './extracurricular-codes'
import { ENCOUNTER_SETS } from '../the-path-to-carcosa/encounter-sets'
const change =
  (patch: Partial<GameState['investigators'][number]>, id = 'a') =>
  (s: GameState): GameState => ({
    ...s,
    investigators: s.investigators.map((i) => (i.id === id ? { ...i, ...patch } : i)),
  })
function game(
  players = 1,
  seed = 11,
  difficulty: Difficulty = 'standard',
  blank = false,
  strong = false,
  critical = false,
) {
  const ids = ['a', 'b', 'c', 'd'].slice(0, players),
    log = emptyCampaignLog(ids)
  if (critical) log.investigators.a!.storyAssets = [M.necronomicon, H.armitage, EA.rice, H.morgan]
  const scenario = theEssexCountyExpress({ difficulty, log })
  let s = throughSetup(
    createGame({
      seed,
      difficulty,
      interactive: true,
      campaignLog: log,
      scenario: { ...scenario, chaosBag: [0], ...(blank ? { encounterDeck: [] } : {}) },
      investigators: ids.map((id) =>
        testInvestigator(id, {
          health: 30,
          sanity: 30,
          ...(strong ? { skills: { willpower: 9, intellect: 9, combat: 9, agility: 9 } } : {}),
        }),
      ),
    }),
  )
  if (s.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    s = choose(s, 'choice.investigator')
  return s
}
function settle(s: GameState) {
  for (
    let n = 0;
    s.pending && !s.outcome && s.pending.question.prompt !== 'prompt.chooseAction' && n < 400;
    n++
  ) {
    const p = s.pending
    const choice = p.question.choices.findIndex((c) =>
      ['choice.revealToken', 'choice.applyResults', 'choice.skip'].includes(c.label),
    )
    s = applyInput(s, { investigator: p.investigator, choice: choice < 0 ? 0 : choice })
  }
  return s
}
const draw = (code: string, investigator = 'a'): Message => ({
  type: 'ResolveEncounterCard',
  investigator,
  card: { ...ESSEX_ENCOUNTERS.find((c) => c.code === code)! },
})
const ability = (s: GameState, key: string, i = 'a') => {
  const a = availableAbilities(s, i).find((a) => a.key.endsWith(key))
  if (!a) throw new Error('Missing ' + key)
  return a
}
const layout =
  (ids: string[], position = 1) =>
  (s: GameState): GameState => ({
    ...s,
    actIndex: 1,
    locations: Object.fromEntries(
      ids.map((id, n) => {
        const card = Object.values(ESSEX_LOCATIONS).find((l) => l.id === id)!
        return [
          id,
          {
            ...card,
            position: [n, 0],
            connections: [ids[n - 1], ids[n + 1]].flatMap((v) => (v ? [v] : [])),
            revealed: true,
            clues: card.clueValue * s.startingInvestigatorCount,
          },
        ]
      }),
    ),
    investigators: s.investigators.map((i) => ({ ...i, location: ids[position]! })),
  })
// Revised guide pp.11-12; original cards 02159-02183. RR: Spawn, Enter, Elimination and Trauma.
describe('The Essex County Express', () => {
  it.each([1, 2, 3, 4])(
    'prepares six random cars and one engine for %i players without entry costs',
    (players) => {
      const s = game(players),
        cars = trainCars(s)
      expect(cars).toHaveLength(7)
      expect(new Set(cars.map((l) => l.id)).size).toBe(7)
      expect(Number(cars[6]!.id)).toBeGreaterThanOrEqual(2175)
      expect(cars[0]!.revealed).toBe(true)
      expect(cars.slice(1).every((l) => !l.revealed)).toBe(true)
      expect(
        s.investigators.every(
          (i) => i.location === cars[0]!.id && i.damage === 0 && i.horror === 0,
        ),
      ).toBe(true)
      expect(s.setAside.map((c) => c.code)).toEqual([T.across, T.across, T.across, T.across])
      expect(
        s.encounterDeck.length + Object.keys(s.enemies).length + s.encounterDiscard.length,
      ).toBe(35)
    },
  )
  it('draws all starting variants and all engine variants across deterministic seeds', () => {
    const starts = new Set(),
      engines = new Set()
    for (let seed = 1; seed <= 45; seed++) {
      const s = game(1, seed),
        cars = trainCars(s)
      starts.add(cars[0]!.id)
      engines.add(cars[6]!.id)
    }
    expect(starts.size).toBe(8)
    expect(engines.size).toBe(3)
  })
  it.each([
    ['easy', -2],
    ['standard', -3],
    ['hard', -4],
    ['expert', -5],
  ] as const)('adds the permanent %s chaos token %i', (difficulty, token) => {
    const s = game(1, 11, difficulty)
    expect(s.campaignLog!.chaosTokens).toEqual([token])
    expect(s.chaosBag).toContain(token)
  })
  it('only an unrevealed destination requires clearing its left neighbor', () => {
    let s = during(game(), layout([T.agilityCar, T.combatCar, T.enginePlain], 0))
    s = during(s, (x) => ({
      ...x,
      locations: {
        ...x.locations,
        [T.combatCar]: { ...x.locations[T.combatCar]!, revealed: false, clues: 0 },
      },
    }))
    expect(availableActions(s, 'a').some((a) => a.kind === 'move' && a.to === T.combatCar)).toBe(
      false,
    )
    s = during(s, keep, {
      type: 'DiscoverClues',
      investigator: 'a',
      location: T.agilityCar,
      amount: 3,
    })
    expect(availableActions(s, 'a').some((a) => a.kind === 'move' && a.to === T.combatCar)).toBe(
      true,
    )
  })
  it.each([
    [T.tear, 1],
    [T.maw, 1],
    [T.rolling, 2],
    [T.drawn, 2],
  ] as const)('agenda %s removes %i left cars and clears every held clue', (code, count) => {
    let s = during(
      game(2),
      (x) => ({
        ...layout([T.parlor, T.agilityCar, T.combatCar, T.enginePlain], 2)(x),
        agendaIndex: x.agendas.findIndex((a) => a.code === code),
        locations: {
          ...layout([T.parlor, T.agilityCar, T.combatCar, T.enginePlain], 2)(x).locations,
          [T.parlor]: {
            ...layout([T.parlor, T.agilityCar, T.combatCar, T.enginePlain], 2)(x).locations[
              T.parlor
            ]!,
            clues: 0,
          },
        },
        investigators: layout(
          [T.parlor, T.agilityCar, T.combatCar, T.enginePlain],
          2,
        )(x).investigators.map((i) => ({ ...i, clues: 2 })),
      }),
      { type: 'AdvanceAgenda' },
    )
    s = settle(s)
    expect(trainCars(s)).toHaveLength(4 - count)
    expect(s.victoryDisplay).toContain(T.parlor)
    expect(s.investigators.every((i) => i.clues === 0)).toBe(true)
  })
  it('falling off a removed car is defeat without trauma and grants a weakness plus bonus XP', () => {
    let s = during(
      game(2),
      (x) =>
        change(
          { location: T.agilityCar },
          'a',
        )(layout([T.agilityCar, T.combatCar, T.enginePlain], 1)(x)),
      { type: 'AdvanceAgenda' },
    )
    s = settle(s)
    expect(getInvestigator(s, 'a').eliminated).toBe(true)
    expect(s.campaignLog!.investigators.a!.physicalTrauma).toBe(0)
    // Apply campaign consequences when the surviving investigator finishes.
    s = settle(
      during(s, keep, { type: 'EndScenario', outcome: { type: 'resolution', resolution: 1 } }),
    )
    expect(s.campaignLog!.investigators.a!.storyAssets).toContain(T.across)
    expect(s.campaignLog!.investigators.a!.xp).toBeGreaterThanOrEqual(1)
  })
  it('the final agenda gives one mental trauma and marks the delay', () => {
    const s = settle(during(game(), (x) => ({ ...x, agendaIndex: 4 }), { type: 'AdvanceAgenda' }))
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 2 })
    expect(s.campaignLog!.investigators.a!.mentalTrauma).toBe(1)
    expect(s.campaignLog!.notes).toContain(TN.delayed)
  })
  it('defeat removes the carried professors and book, records their loss, and awards Across Space and Time', () => {
    const s = settle(
      during(game(1, 11, 'standard', false, false, true), keep, {
        type: 'EliminateInvestigator',
        investigator: 'a',
      }),
    )
    expect(s.campaignLog!.investigators.a!.storyAssets).toEqual([T.across])
    expect(s.campaignLog!.notes).toEqual(
      expect.arrayContaining([
        TN.necronomiconStolen,
        HN.armitageKidnapped,
        N.riceKidnapped,
        HN.morganKidnapped,
        TN.delayed,
      ]),
    )
  })
  it.each([
    [T.agilityCar, '01092'],
    [T.combatCar, '01091'],
    [T.willCar, '01089'],
    [T.intellectCar, '01090'],
    [T.wildCar, '01093'],
  ] as const)('entry into %s can pay matching icons from hand', (code, card) => {
    let s = during(
      game(),
      (x) => ({
        ...change({ hand: [card, card], location: T.sleeping })(
          layout([T.sleeping, code, T.enginePlain], 0)(x),
        ),
      }),
      { type: 'MoveTo', investigator: 'a', location: code },
    )
    expect(s.pending?.question.choices.some((c) => c.label === 'choice.essex.icons')).toBe(true)
    s = choose(s, 'choice.essex.icons')
    s = settle(s)
    expect(getInvestigator(s, 'a').damage).toBe(0)
    expect(getInvestigator(s, 'a').horror).toBe(0)
    expect(getInvestigator(s, 'a').hand.length).toBeLessThan(2)
  })
  it('sleeping car resources are limited to one use for the whole group', () => {
    let s = during(game(2), layout([T.agilityCar, T.sleeping, T.enginePlain]))
    s = during(s, keep, ...ability(s, 'train:luggage').then)
    expect(getInvestigator(s, 'a').resources).toBe(8)
    expect(availableAbilities(s, 'b').some((a) => a.key === 'train:luggage')).toBe(false)
  })
  it('the parlor cannot be investigated and charges three resources per discovered clue', () => {
    let s = during(game(), layout([T.agilityCar, T.parlor, T.enginePlain]))
    expect(availableActions(s, 'a').some((a) => a.kind === 'investigate')).toBe(false)
    const a = ability(s, 'train:parlor')
    s = during(s, keep, ...a.costs!, ...a.then)
    expect(s.locations[T.parlor]!.clues).toBe(0)
    expect(getInvestigator(s, 'a').resources).toBe(2)
  })
  it('Grappling Horror blocks all movement while engaged and evading restores movement', () => {
    let s = during(game(), layout([T.agilityCar, T.combatCar, T.enginePlain]), draw(T.grappling))
    const e = Object.values(s.enemies).find((e) => e.code === T.grappling)!
    expect(availableActions(s, 'a').some((a) => a.kind === 'move')).toBe(false)
    s = during(s, keep, { type: 'EvadeEnemy', enemy: e.id, by: 'a' })
    expect(availableActions(s, 'a').some((a) => a.kind === 'move')).toBe(true)
  })
  it('Emergent Monstrosity appears to the right exhausted and does not engage even when its spawn is occupied', () => {
    const s = during(
      game(),
      layout([T.agilityCar, T.combatCar, T.enginePlain], 2),
      draw(T.emergent),
    )
    const e = Object.values(s.enemies).find((e) => e.code === T.emergent)!
    expect(e.location).toBe(T.enginePlain)
    expect(e.exhausted).toBe(true)
    expect(e.engagedWith).toBeNull()
  })
  it('Claws of Steam assigns damage to controlled assets first and prevents movement for this round', () => {
    let s = during(
      game(),
      (x) =>
        change({ skills: { willpower: 0, intellect: 3, combat: 3, agility: 3 } })(
          layout([T.agilityCar, T.combatCar, T.enginePlain])(x),
        ),
      { type: 'PutAssetIntoPlay', investigator: 'a', code: EA.rice },
      { type: 'PutAssetIntoPlay', investigator: 'a', code: M.harold },
      draw(T.claws),
    )
    s = choose(choose(s, 'choice.revealToken'), 'choice.applyResults')
    expect(s.pending?.question.choices.every((c) => c.target?.type === 'asset')).toBe(true)
    s = settle(s)
    expect(getInvestigator(s, 'a').damage).toBe(0)
    expect(availableActions(s, 'a').some((a) => a.kind === 'move')).toBe(false)
    s = during(s, (x) => ({ ...x, round: x.round + 1 }))
    expect(availableActions(s, 'a').some((a) => a.kind === 'move')).toBe(true)
  })
  it('Broken Rails affects every investigator at the revealed card location', () => {
    let s = during(
      game(2),
      (x) => change({ damage: 4 })(layout([T.agilityCar, T.combatCar, T.enginePlain])(x)),
      { type: 'PutAssetIntoPlay', investigator: 'a', code: EA.rice },
      draw(T.rails),
    )
    s = settle(s)
    expect(getInvestigator(s, 'a').actionsRemaining).toBe(2)
    expect(Object.values(s.assets).some((a) => a.code === EA.rice)).toBe(false)
  })
  it('the helpless passenger appears to the left, can be rescued, and leaving play horrifies everyone', () => {
    let s = during(game(2), layout([T.agilityCar, T.combatCar, T.enginePlain]), draw(T.passenger))
    s = settle(s)
    const p = Object.values(s.placedAssets ?? {}).find((a) => a.code === T.passenger)!
    expect(p.placement).toEqual({ type: 'location', location: T.agilityCar })
    s = during(
      s,
      change({ location: T.agilityCar }),
      ...availableAbilities(during(s, change({ location: T.agilityCar })), 'a').find(
        (a) => a.key === p.id + ':parley',
      )!.then,
    )
    const asset = Object.values(s.assets).find((a) => a.code === T.passenger)!
    s = settle(during(s, keep, { type: 'DiscardAsset', asset: asset.id }))
    for (const id of ['a', 'b']) expect(getInvestigator(s, id).horror).toBeGreaterThanOrEqual(1)
    expect(s.encounterDiscard.filter((c) => c.code === T.passenger).length).toBeGreaterThanOrEqual(
      1,
    )
  })
  it('Across Space and Time mills three cards when drawn as a player weakness', () => {
    let s = during(game(), change({ deck: [T.across, 'a1', 'a2', 'a3', 'a4'] }), {
      type: 'DrawCards',
      investigator: 'a',
      amount: 1,
    })
    s = settle(s)
    expect(getInvestigator(s, 'a').discard).toEqual(expect.arrayContaining(['a1', 'a2', 'a3']))
    expect(getInvestigator(s, 'a').deck).toEqual(['a4'])
  })
  it('Dark Cult doom reaches the threshold without advancing until the normal check', () => {
    const acolyte = ENCOUNTER_SETS.darkCult.find((c) => c.code === '01169') as EnemyCard
    let s = during(
      game(),
      (x) => ({ ...layout([T.agilityCar, T.combatCar, T.enginePlain])(x), doom: 3 }),
      spawnAt(T.agilityCar, acolyte),
    )
    expect(s.agendaIndex).toBe(0)
    s = during(s, keep, { type: 'CheckAgenda' })
    expect(s.agendaIndex).toBe(1)
  })
})

it('a complete legal action sequence gets the engine running without state edits after preparation', () => {
  let s = game(1, 11, 'standard', true, true)
  for (let n = 0; n < 160 && !s.outcome; n++) {
    s = settle(s)
    if (s.outcome) break
    const p = s.pending
    if (!p) throw new Error('Train route interrupted')
    const i = getInvestigator(s, 'a'),
      location = s.locations[i.location!]!,
      cars = trainCars(s),
      next = cars[cars.findIndex((l) => l.id === i.location) + 1]
    let index =
      location.clues > 0
        ? p.question.choices.findIndex(
            (c) =>
              c.label ===
              (location.id === T.parlor ? 'ability.essex.parlor' : 'action.investigate'),
          )
        : -1
    if (index < 0 && location.clues === 0 && next)
      index = p.question.choices.findIndex(
        (c) =>
          c.label === 'action.move' && c.target?.type === 'location' && c.target.id === next.id,
      )
    if (index < 0) index = p.question.choices.findIndex((c) => c.label === 'action.endTurn')
    if (index < 0) throw new Error('No legal train action')
    s = applyInput(s, { investigator: p.investigator, choice: index })
  }
  s = settle(s)
  expect(s.outcome).toEqual({ type: 'resolution', resolution: 1 })
  expect(s.campaignLog!.notes).not.toContain(TN.delayed)
  expect(s.campaignLog!.investigators.a!.mentalTrauma).toBe(0)
})
it.each([1, 2, 3, 4])(
  'full train encounter decks terminate legally for %i real starter investigators and save Dunwich next',
  (players) => {
    const c = {
      ...newCampaign(
        'the-dunwich-legacy',
        ['joe', 'trish', 'dexter', 'daniela'].slice(0, players),
        'standard',
      ),
      scenarioIndex: 3,
    }
    const s = playRandomlyToEnd(startScenario(c, 100 + players), 200 + players, 3500)
    expect(currentScenario(finishScenario(c, s))).toBe('blood-on-the-altar')
  },
)
it.each([
  ['agility', 'choice.essex.agility', 'mentalTrauma'],
  ['combat', 'choice.essex.combat', 'physicalTrauma'],
] as const)(
  'the actual engine entrant resolves %s and bears any trauma',
  (_skill, label, trauma) => {
    let s = during(
      game(2),
      (x) => ({
        ...layout([T.agilityCar, T.combatCar, T.enginePlain])(x),
        actIndex: 0,
        locations: {
          ...layout([T.agilityCar, T.combatCar, T.enginePlain])(x).locations,
          [T.combatCar]: {
            ...layout([T.agilityCar, T.combatCar, T.enginePlain])(x).locations[T.combatCar]!,
            clues: 0,
          },
        },
        investigators: layout([T.agilityCar, T.combatCar, T.enginePlain])(x).investigators.map(
          (i) =>
            i.id === 'b'
              ? { ...i, skills: { willpower: 0, intellect: 0, combat: 0, agility: 0 } }
              : i,
        ),
      }),
      { type: 'MoveTo', investigator: 'b', location: T.enginePlain },
    )
    expect(s.pending!.investigator).toBe('b')
    s = choose(s, label)
    s = settle(s)
    expect(s.campaignLog!.investigators.b![trauma]).toBe(1)
    expect(s.campaignLog!.investigators.a![trauma]).toBe(0)
  },
)
it('the engine reveal draws encounters for the mover, even outside their turn', () => {
  const card = ESSEX_ENCOUNTERS.find((c) => c.code === T.claws)!
  const s = during(
    game(2),
    (x) => ({
      ...layout([T.agilityCar, T.combatCar, T.engineDraw])(x),
      locations: {
        ...layout([T.agilityCar, T.combatCar, T.engineDraw])(x).locations,
        [T.combatCar]: {
          ...layout([T.agilityCar, T.combatCar, T.engineDraw])(x).locations[T.combatCar]!,
          clues: 0,
        },
        [T.engineDraw]: {
          ...layout([T.agilityCar, T.combatCar, T.engineDraw])(x).locations[T.engineDraw]!,
          revealed: false,
          clues: 0,
        },
      },
      encounterDeck: [{ ...card }, { ...card }, { ...card }],
    }),
    { type: 'MoveTo', investigator: 'b', location: T.engineDraw },
  )
  expect(s.skillTest!.investigator).toBe('b')
})
it.each(['standard', 'hard'] as const)(
  'the %s tablet places doom on the nearest/all cultists without premature advancement',
  (difficulty) => {
    const enemy: EnemyCard = {
      kind: 'enemy',
      code: 'test-cultist',
      name: 'Cultist',
      traits: ['Cultist'],
      fight: 1,
      health: 1,
      evade: 1,
      damage: 0,
      horror: 0,
      keywords: [],
    }
    let s = during(
      game(1, 11, difficulty),
      (x) => ({ ...layout([T.agilityCar, T.combatCar, T.enginePlain], 0)(x), doom: 3 }),
      spawnAt(T.combatCar, enemy),
      spawnAt(T.enginePlain, { ...enemy, code: 'far-cultist' }),
    )
    const effect = scenarioBehavior(s.scenarioId)!.tokenEffect!(s, 'tablet', 'a')
    s = during(s, keep, ...effect.immediate!)
    const near = Object.values(s.enemies).find((e) => e.code === 'test-cultist')!,
      far = Object.values(s.enemies).find((e) => e.code === 'far-cultist')!
    expect(near.doom).toBe(1)
    expect(far.doom ?? 0).toBe(difficulty === 'hard' ? 1 : 0)
    expect(s.agendaIndex).toBe(0)
  },
)
it('a failed cultist ends only the tested investigator turn and leaves no unfinished skill test', () => {
  let s = during(
    game(2, 11, 'standard', true),
    (x) => ({
      ...change({ skills: { willpower: 0, intellect: 3, combat: 3, agility: 3 } })(x),
      chaosBag: ['cultist'],
    }),
    {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'willpower',
      difficulty: 3,
      kind: { type: 'effect', source: 'Cultist', onSuccess: [], onFail: [], onFailEach: [] },
    },
  )
  s = choose(choose(s, 'choice.revealToken'), 'choice.applyResults')
  s = settle(s)
  expect(getInvestigator(s, 'a').turnTaken).toBe(true)
  expect(s.activeTurn).toBe('b')
  expect(s.skillTest).toBeNull()
})
