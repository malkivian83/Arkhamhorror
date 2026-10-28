import {
  applyInput,
  availableActions,
  createGame,
  emptyCampaignLog,
  enemyMaxHealth,
  printedCode,
  scenarioBehavior,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, during, keep, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import '../index'
import {
  lostInTimeAndSpace,
  L,
  LN,
  LOST_ENCOUNTER_LOCATIONS,
  LOST_ENCOUNTERS,
} from './lost-in-time-and-space'
import { lostSpecific as specific } from './lost-helpers'
import { yogSothoth } from './yog-sothoth'
import { interstellarTraveler } from './interstellar-traveler'
import { yithianStarseeker } from './yithian-starseeker'
import { BN } from './altar-codes'
import { UN } from './unseen-codes'
import { DUNWICH_NOTES } from './extracurricular-codes'
import { newCampaign, startScenario, finishScenario, currentScenario } from '../campaign'
import { playRandomlyToEnd } from '../scenario-testing'
import { DUNWICH_ENCOUNTER_SETS } from './encounter-sets'
function game(players = 1, notes: string[] = [], values: Record<string, string> = {}, vitals = 40) {
  const ids = ['a', 'b', 'c', 'd'].slice(0, players),
    log = emptyCampaignLog(ids)
  log.notes = notes
  log.values = values
  let s = throughSetup(
    createGame({
      seed: 12,
      interactive: true,
      campaignLog: log,
      scenario: { ...lostInTimeAndSpace({ log }), chaosBag: [0] },
      investigators: ids.map((id) =>
        testInvestigator(id, {
          health: vitals,
          sanity: vitals,
          skills: { willpower: 9, intellect: 9, combat: 9, agility: 9 },
        }),
      ),
    }),
  )
  if (s.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    s = choose(s, 'choice.investigator')
  return s
}
const actor =
  (patch: Partial<GameState['investigators'][number]>, id = 'a') =>
  (s: GameState): GameState => ({
    ...s,
    investigators: s.investigators.map((i) => (i.id === id ? { ...i, ...patch } : i)),
  })
const card = (code: string) => LOST_ENCOUNTER_LOCATIONS.find((c) => c.code === code)!
const put = (code: string): Message => ({
  type: 'PutEncounterLocation',
  card: card(code),
  investigator: 'a',
})
const where = (s: GameState, code: string) =>
  Object.keys(s.locations).filter((id) => printedCode(id) === code)
function settle(s: GameState) {
  for (
    let n = 0;
    s.pending && !s.outcome && s.pending.question.prompt !== 'prompt.chooseAction' && n < 1000;
    n++
  ) {
    const p = s.pending,
      index = p.question.choices.findIndex((c) =>
        ['choice.revealToken', 'choice.applyResults', 'choice.skip', 'choice.lost.doom'].includes(
          c.label,
        ),
      )
    s = applyInput(s, { investigator: p.investigator, choice: index < 0 ? 0 : index })
  }
  return s
}
describe('Lost in Time and Space — revised guide pp.21–23', () => {
  it.each([1, 2, 3, 4])(
    'a legal campaign run with %i real starter decks reaches its ending and saves',
    (players) => {
      const c = {
        ...newCampaign(
          'the-dunwich-legacy',
          ['joe', 'daniela', 'trish', 'dexter'].slice(0, players),
          'standard',
        ),
        scenarioIndex: 7,
      }
      c.log.notes.push(UN.calmed)
      const s = playRandomlyToEnd(startScenario(c, 1050 + players, true), 1050 + players, 16000)
      const next = JSON.parse(JSON.stringify(finishScenario(c, s)))
      expect(currentScenario(next)).toBeNull()
      expect(next.log.notes.includes('campaignWon')).toBe(
        s.campaignLog?.notes.includes('campaignWon'),
      )
    },
  )
  it('a complete legal battle defeats Yog-Sothoth and reaches R3 without editing the prepared state', () => {
    let s = game(1, [], {}, 80)
    const trace: unknown[] = []
    for (let n = 0; n < 600 && !s.outcome; n++) {
      s = settle(s)
      if (s.outcome) break
      const p = s.pending!,
        choices = p.question.choices
      let selected = choices.findIndex(
        (c) =>
          c.label === 'action.fight' &&
          c.target?.type === 'enemy' &&
          s.enemies[c.target.id]?.code === L.yog,
      )
      if (selected < 0) selected = choices.findIndex((c) => c.label === 'action.fight')
      if (selected < 0) selected = choices.findIndex((c) => c.label === 'action.endTurn')
      if (selected < 0) throw Error(JSON.stringify(p.question))
      trace.push({
        round: s.round,
        agenda: s.agendaIndex,
        choice: choices[selected]!.label,
        damage: s.investigators[0]!.damage,
        horror: s.investigators[0]!.horror,
      })
      s = applyInput(s, { investigator: p.investigator, choice: selected })
    }
    expect(s.outcome, JSON.stringify(trace.slice(-20))).toEqual({
      type: 'resolution',
      resolution: 3,
    })
    expect(s.campaignLog?.notes).toContain(LN.fled)
  })
  it.each([1, 2, 3, 4])(
    'prepares %i investigators and ten physical encounter locations',
    (players) => {
      const s = game(players)
      expect(s.encounterDeck).toHaveLength(42)
      expect(s.encounterDeck.filter((c) => c.kind === 'location')).toHaveLength(10)
      expect(Object.keys(s.locations)).toEqual([L.another])
      expect(Object.keys(s.setAsideLocations)).toHaveLength(2)
    },
  )
  it('puts single-sided locations into play revealed with independent clues and copy IDs', () => {
    const s = during(game(2), keep, put(L.space), put(L.space), put(L.cascade), put(L.steps))
    const ids = where(s, L.space)
    expect(ids).toHaveLength(2)
    expect(ids[0]).not.toBe(ids[1])
    expect(ids.every((id) => s.locations[id]?.revealed && s.locations[id]?.clues === 1)).toBe(true)
    expect(s.locations[where(s, L.cascade)[0]!]!.clues).toBe(3)
    expect(s.locations[where(s, L.steps)[0]!]!.clues).toBe(2)
    expect(s.locations[ids[0]!]!.connections).toContain(ids[1])
    expect(JSON.parse(JSON.stringify(s)).locations[ids[0]!]!.encounterCard.kind).toBe('location')
  })
  it('a drawn Tear has Surge, while resolving its revelation from the act does not draw another card', () => {
    let s = during(game(), (x) => ({ ...x, encounterDeck: [], encounterDiscard: [] }), {
      type: 'ResolveEncounterCard',
      investigator: 'a',
      card: card(L.space),
    })
    expect(where(s, L.space)).toHaveLength(1)
    s = during(
      s,
      (x) => ({ ...x, encounterDeck: [card(L.space), card(L.cascade)] }),
      specific('lostMillLocation'),
    )
    expect(where(s, L.space)).toHaveLength(2)
    expect(s.encounterDeck).toHaveLength(1)
  })
  it('the cultist token puts a location in play without resolving its revelation', () => {
    let s = during(game(), actor({ hand: ['01088'] }), specific('lostShuffleEncounter'))
    s = during(
      s,
      (x) => ({ ...x, encounterDeck: [card(L.cascade)] }),
      specific('lostMillLocation', { move: true, revelation: false, investigator: 'a' }),
    )
    expect(s.investigators[0]?.hand).toEqual(['01088'])
    expect(printedCode(s.investigators[0]!.location!)).toBe(L.cascade)
    expect(s.investigators[0]?.horror).toBe(1)
  })
  it('the act explores three cards, selecting just one discarded location without Surge', () => {
    let s = during(
      game(),
      (x) => ({ ...x, encounterDeck: [card(L.space), card(L.cascade), yithianStarseeker] }),
      specific('lostExplore', { investigator: 'a' }),
    )
    expect(s.pending?.question.prompt).toBe('prompt.lost.explore')
    s = settle(applyInput(s, { investigator: 'a', choice: 0 }))
    expect(where(s, L.space)).toHaveLength(1)
    expect(s.encounterDiscard.map((c) => c.code)).toEqual([L.cascade, L.starseeker])
  })
  it('Wormhole resolves the new location, moves there and applies the agenda horror', () => {
    let s = during(game(), actor({ resources: 5 }), specific('lostShuffleEncounter'))
    s = during(
      s,
      (x) => ({ ...x, encounterDeck: [card(L.bridge)] }),
      specific('lostMillLocation', { investigator: 'a', move: true }),
    )
    expect(s.investigators[0]?.resources).toBe(3)
    expect(s.investigators[0]?.horror).toBe(1)
    expect(printedCode(s.investigators[0]!.location!)).toBe(L.bridge)
  })
  it('discarding an occupied location moves investigators, their engaged enemies and unengaged enemies before removing it', () => {
    let s = during(game(2), keep, put(L.bridge))
    const id = where(s, L.bridge)[0]!
    s = during(
      s,
      (x) => actor({ location: id }, 'b')(actor({ location: id })(x)),
      { type: 'SpawnEnemy', card: yithianStarseeker, location: id, engageWith: 'a' },
      { type: 'SpawnEnemy', card: yithianStarseeker, location: id, engageWith: null },
    )
    s = settle(s)
    s = settle(during(s, keep, { type: 'RemoveLocation', location: id }))
    expect(s.locations[id]).toBeUndefined()
    expect(s.investigators.every((i) => i.location === L.another && i.horror === 1)).toBe(true)
    expect(Object.values(s.enemies).every((e) => e.location === L.another)).toBe(true)
    expect(s.encounterDiscard.filter((c) => c.code === L.bridge)).toHaveLength(1)
  })
  it('a depleted Cascade leaves play whether its last clue was discovered or moved by a Traveler', () => {
    let s = during(game(), keep, put(L.cascade))
    const id = where(s, L.cascade)[0]!
    s = during(s, actor({ location: id }), { type: 'DiscoverClues', investigator: 'a', amount: 3 })
    expect(s.locations[id]).toBeUndefined()
    expect(s.investigators[0]?.location).toBe(L.another)
    s = during(s, keep, put(L.cascade))
    const next = where(s, L.cascade)[0]!
    s = during(
      s,
      keep,
      { type: 'MoveClues', from: { type: 'location', id: next }, to: { type: 'pool' }, amount: 2 },
      { type: 'SpawnEnemy', card: interstellarTraveler, location: next, engageWith: null },
    )
    expect(s.locations[next]).toBeUndefined()
    expect(Object.values(s.enemies)[0]?.location).toBe(L.another)
  })
  it('Tears decay at round end and Bridges force a choice after leaving, without recursively decaying on removal', () => {
    let s = during(game(), keep, put(L.space), put(L.bridge))
    s = settle(during(s, keep, { type: 'Forced', trigger: { type: 'roundEnds' } }))
    expect(s.locations[where(s, L.space)[0]!]!.doom).toBe(1)
    const bridge = where(s, L.bridge)[0]!
    s = during(s, actor({ location: bridge }), {
      type: 'MoveTo',
      investigator: 'a',
      location: L.another,
    })
    expect(s.pending?.question.prompt).toBe('prompt.lost.decay')
    s = applyInput(s, { investigator: 'a', choice: 1 })
    expect(s.locations[bridge]).toBeUndefined()
  })
  it('failed willpower leaving the Steps shuffles the physical location and relocates its occupant', () => {
    let s = during(game(), keep, put(L.steps))
    const id = where(s, L.steps)[0]!
    s = settle(
      during(
        s,
        actor({ location: id, skills: { willpower: 0, intellect: 9, combat: 9, agility: 9 } }),
        { type: 'MoveTo', investigator: 'a', location: L.another },
      ),
    )
    expect(s.locations[id]).toBeUndefined()
    expect(s.investigators[0]?.location).toBe(L.another)
    expect(s.encounterDeck.some((c) => c.code === L.steps)).toBe(true)
    expect(s.investigators[0]?.horror).toBe(1)
  })
  it('the Doorway either spends resources or shuffles itself at the end of its occupant’s turn', () => {
    let s = during(game(), keep, put(L.doorway))
    const id = where(s, L.doorway)[0]!
    s = during(s, actor({ location: id, resources: 2 }), {
      type: 'Forced',
      trigger: { type: 'turnEnds', investigator: 'a' },
    })
    expect(s.pending?.question.prompt).toBe('prompt.lost.doorway')
    s = applyInput(s, { investigator: 'a', choice: 0 })
    expect(s.investigators[0]?.resources).toBe(0)
    s = settle(
      during(s, keep, { type: 'Forced', trigger: { type: 'turnEnds', investigator: 'a' } }),
    )
    expect(s.locations[id]).toBeUndefined()
  })
  it.each([1, 2, 3, 4])('Yog has printed 4 plus 6 per investigator (%i)', (players) => {
    const s = during(game(players), keep, {
      type: 'SpawnEnemy',
      card: yogSothoth,
      location: L.another,
      engageWith: null,
    })
    expect(enemyMaxHealth(s, Object.values(s.enemies)[0]!)).toBe(4 + 6 * players)
    expect(availableActions(s, 'a').some((a) => a.kind === 'evade')).toBe(false)
  })
  it('Yog cannot be evaded even by an automatic effect', () => {
    let s = during(game(), keep, {
      type: 'SpawnEnemy',
      card: yogSothoth,
      location: L.another,
      engageWith: null,
    })
    const id = Object.keys(s.enemies)[0]!
    s = during(s, keep, { type: 'EvadeEnemy', enemy: id, by: 'a' })
    expect(s.enemies[id]?.exhausted).toBe(false)
  })
  it('Yog replaces chosen horror with discarding, and an empty deck drives the target insane', () => {
    let s = during(
      game(2),
      actor({ deck: ['01088', '01088', '01088', '01088', '01088', '01088'] }),
      { type: 'SpawnEnemy', card: yogSothoth, location: L.another, engageWith: null },
    )
    const id = Object.keys(s.enemies)[0]!
    s = during(s, keep, { type: 'EnemyAttack', enemy: id, investigator: 'a', exhaustAfter: false })
    s = choose(s, 'ability.lost.yog')
    s = choose(s, 'choice.lost.mill', { amount: 3 })
    s = settle(s)
    expect(s.investigators[0]?.horror).toBe(2)
    expect(s.investigators[0]?.deck).toHaveLength(3)
    s = during(s, keep, { type: 'EnemyAttack', enemy: id, investigator: 'a', exhaustAfter: false })
    s = choose(s, 'ability.lost.yog')
    s = choose(s, 'choice.lost.mill', { amount: 3 })
    s = settle(s)
    expect(s.campaignLog?.investigators.a?.insane).toBe(true)
    expect(s.campaignLog?.investigators.a?.mentalTrauma).toBe(0)
  })
  it('agenda four repeats, clears doom and attacks every investigator even from another location', () => {
    let s = during(game(2), keep, {
      type: 'SpawnEnemy',
      card: yogSothoth,
      location: L.another,
      engageWith: null,
    })
    s = settle(during(s, (x) => ({ ...x, agendaIndex: 3, doom: 2 }), { type: 'CheckAgenda' }))
    expect(s.agendaIndex).toBe(3)
    expect(s.doom).toBe(0)
    expect(s.outcome).toBeNull()
    expect(s.investigators.every((i) => i.horror === 5 && i.damage === 1)).toBe(true)
  })
  it.each([1, 2, 3, 4])('resolution %i records the exact ending and epilogue branch', (n) => {
    const s = settle(
      during(game(1, [UN.warned]), keep, {
        type: 'EndScenario',
        outcome: { type: 'resolution', resolution: n },
      }),
    )
    expect(s.campaignLog?.notes).toContain(n === 4 ? 'campaignLost' : 'campaignWon')
    if (n === 1) {
      expect(s.campaignLog?.notes).toContain(LN.closed)
      expect(s.campaignLog?.investigators.a?.physicalTrauma).toBe(2)
      expect(s.campaignLog?.investigators.a?.xp).toBe(5)
    }
    if (n === 3) expect(s.campaignLog?.investigators.a?.killed).toBe(true)
  })
  it.each([0, 3])(
    'defeat at act index %i kills the investigator and routes to the correct ending',
    (actIndex) => {
      const s = settle(
        during(game(), (x) => ({ ...x, actIndex }), {
          type: 'DefeatInvestigator',
          investigator: 'a',
        }),
      )
      expect(s.outcome).toEqual({ type: 'resolution', resolution: actIndex === 3 ? 2 : 4 })
      expect(s.campaignLog?.investigators.a?.killed).toBe(true)
    },
  )
  it('closing the rift removes Edge through its forced relocation before putting Tear Through Time in play', () => {
    let s = during(game(), keep, { type: 'PutLocationIntoPlay', location: L.edge })
    s = settle(
      during(s, (x) => actor({ location: L.edge, clues: 3 })({ ...x, actIndex: 2 }), {
        type: 'AdvanceAct',
      }),
    )
    expect(s.locations[L.edge]).toBeUndefined()
    expect(s.locations[L.time]).toBeDefined()
    expect(s.investigators[0]?.location).toBe(L.another)
  })
  it('entry to Edge needs two controlled clues and its upkeep restriction does not block ordinary draws', () => {
    let s = during(game(), keep, { type: 'PutLocationIntoPlay', location: L.edge })
    s = during(s, keep, { type: 'MoveTo', investigator: 'a', location: L.edge })
    expect(s.investigators[0]?.location).toBe(L.another)
    s = during(s, actor({ clues: 2 }), { type: 'MoveTo', investigator: 'a', location: L.edge })
    const behavior = scenarioBehavior(s.scenarioId)!
    expect(behavior.cannotDrawCards?.({ ...s, phase: 'upkeep' }, 'a')).toBe(true)
    expect(behavior.cannotDrawCards?.({ ...s, phase: 'investigation' }, 'a')).toBe(false)
  })
  it('the final personal two-clue resignation leads to R1 instead of the default no-resolution ending', () => {
    let s = during(
      game(),
      keep,
      { type: 'PutLocationIntoPlay', location: L.time },
      { type: 'RevealLocation', location: L.time },
    )
    s = settle(
      during(
        s,
        (x) => actor({ location: L.time, clues: 2 })({ ...x, actIndex: 3 }),
        { type: 'SpendClues', investigator: 'a', amount: 2 },
        { type: 'Resign', investigator: 'a' },
      ),
    )
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 1 })
  })
  it('agenda memories use the campaign log and the real sacrificed count', () => {
    let s = during(
      game(1, [DUNWICH_NOTES.studentsLost], { [BN.sacrificed]: '02040,02061' }),
      keep,
      specific('lostAgendaMemory', { agenda: 1 }),
    )
    s = settle(s)
    expect(s.investigators[0]?.horror).toBe(1)
    s = settle(
      during(
        s,
        actor({ skills: { willpower: 0, intellect: 9, combat: 9, agility: 9 } }),
        specific('lostAgendaMemory', { agenda: 2 }),
      ),
    )
    expect(s.investigators[0]?.damage).toBe(2)
  })
  it.each([UN.calmed, UN.warned])(
    'the campaign epilogue follows %s and is omitted in standalone mode',
    (note) => {
      const s = game(1, [note]),
        behavior = scenarioBehavior(s.scenarioId)!
      const stories = behavior.resolution!(s, { type: 'resolution', resolution: 1 }).filter(
        (m) => m.type === 'Story',
      )
      expect(
        stories.some(
          (m) =>
            m.type === 'Story' &&
            m.entry.body === `story.lost.${note === UN.calmed ? 'epilogue1' : 'epilogue2'}`,
        ),
      ).toBe(true)
      expect(
        behavior.resolution!(
          { ...s, scenarioMeta: { ...s.scenarioMeta, lostStandalone: 1 } },
          { type: 'resolution', resolution: 1 },
        ).some((m) => m.type === 'Story' && m.entry.body.includes('epilogue')),
      ).toBe(false)
    },
  )
  it('the Cascade discards one random hand card and the Steps draw and resolve the top Madness', () => {
    let s = during(
      game(),
      actor({ hand: ['01088', '01088', '01088'], discard: ['12097'] }),
      put(L.cascade),
    )
    expect(s.investigators[0]?.hand).toHaveLength(2)
    s = settle(during(s, keep, put(L.steps)))
    expect(s.investigators[0]?.hand).toHaveLength(1)
    expect(s.investigators[0]?.discard.filter((c) => c === '12097')).toHaveLength(1)
  })
  it.each([10, 11])(
    'the Starseeker adds doom only if the attacked investigator has more than ten discarded cards (%i)',
    (count) => {
      let s = during(game(), actor({ discard: Array(count).fill('01088') }), {
        type: 'SpawnEnemy',
        card: yithianStarseeker,
        location: L.another,
        engageWith: 'a',
      })
      const id = Object.keys(s.enemies)[0]!
      s = during(s, keep, {
        type: 'Forced',
        trigger: { type: 'whenEnemyAttacks', enemy: id, investigator: 'a' },
      })
      expect(s.enemies[id]?.doom ?? 0).toBe(count === 11 ? 1 : 0)
    },
  )
  it.each([false, true])(
    'Collapsing Reality resolves its printed damage and location discard (extradimensional %s)',
    (extra) => {
      let s = during(game(), keep, put(L.space))
      const location = extra ? where(s, L.space)[0]! : L.another
      s = settle(
        during(s, actor({ location }), {
          type: 'ResolveEncounterCard',
          investigator: 'a',
          card: LOST_ENCOUNTERS.find((c) => c.code === L.collapsing)!,
        }),
      )
      expect(s.investigators[0]?.damage).toBe(extra ? 1 : 2)
      if (extra) {
        expect(s.locations[location]).toBeUndefined()
        expect(s.investigators[0]?.horror).toBe(1)
      }
    },
  )
  it('Wormhole draws through its registered revelation and resolves the new location effect', () => {
    let s = during(
      game(),
      (x) => ({ ...actor({ resources: 5 })(x), encounterDeck: [card(L.bridge)] }),
      {
        type: 'ResolveEncounterCard',
        investigator: 'a',
        card: LOST_ENCOUNTERS.find((c) => c.code === L.wormhole)!,
      },
    )
    s = settle(s)
    expect(s.investigators[0]?.resources).toBe(3)
    expect(s.investigators[0]?.horror).toBe(1)
  })
  it('Vast Expanse gains Surge without extra locations and caps its group test at five', () => {
    const draw: Message = {
      type: 'ResolveEncounterCard',
      investigator: 'a',
      card: LOST_ENCOUNTERS.find((c) => c.code === L.expanse)!,
    }
    let s = settle(during(game(), (x) => ({ ...x, encounterDeck: [yithianStarseeker] }), draw))
    expect(Object.values(s.enemies).some((e) => e.code === L.starseeker)).toBe(true)
    s = during(
      s,
      actor({ skills: { willpower: 0, intellect: 9, combat: 9, agility: 9 } }),
      ...Array.from({ length: 6 }, () => put(L.space)),
    )
    s = settle(during(s, keep, draw))
    expect(s.investigators[0]?.horror).toBe(5)
  })
  it.each([false, true])(
    'the third agenda spawns Yog at Edge only when it is in play (%s)',
    (edge) => {
      let s = game()
      if (edge) s = during(s, keep, { type: 'PutLocationIntoPlay', location: L.edge })
      s = settle(during(s, (x) => ({ ...x, agendaIndex: 2 }), { type: 'AdvanceAgenda' }))
      expect(s.agendaIndex).toBe(3)
      expect(Object.values(s.enemies).find((e) => e.code === L.yog)?.location).toBe(
        edge ? L.edge : L.another,
      )
    },
  )
  it('both reference faces count physical extra locations and use the current shroud', () => {
    const s = during(game(), keep, ...Array.from({ length: 6 }, () => put(L.space)))
    const b = scenarioBehavior(s.scenarioId)!
    expect(b.tokenEffect!(s, 'skull', 'a').modifier).toBe(-5)
    expect(b.tokenEffect!({ ...s, difficulty: 'hard' }, 'skull', 'a').modifier).toBe(-6)
    expect(b.tokenEffect!(s, 'elderThing', 'a').modifier).toBe(-6)
    expect(b.tokenEffect!({ ...s, difficulty: 'expert' }, 'elderThing', 'a').modifier).toBe(-12)
  })
  it('Another Dimension cannot be cancelled by an attached Arcane Barrier and removes attached cards', () => {
    let s = during(game(), keep, put(L.space))
    const location = where(s, L.space)[0]!
    s = during(
      s,
      (x) => ({
        ...actor({ location, skills: { willpower: 0, intellect: 9, combat: 9, agility: 9 } })(x),
        placedAssets: {
          marker: {
            id: 'marker',
            code: 'test-marker',
            name: 'Marker',
            placement: { type: 'location', location },
            exhausted: false,
            damage: 0,
            horror: 0,
          },
        },
      }),
      {
        type: 'ResolveEncounterCard',
        investigator: 'a',
        card: DUNWICH_ENCOUNTER_SETS.theBeyond.find((c) => c.code === '02102')!,
      },
    )
    s = during(s, keep, { type: 'RemoveLocation', location })
    expect(s.investigators[0]?.location).toBe(L.another)
    expect(s.investigators[0]?.horror).toBe(1)
    expect(s.skillTest).toBeNull()
    expect(s.placedAssets?.marker).toBeUndefined()
    expect(s.encounterDiscard.some((c) => c.code === '02102')).toBe(true)
  })
})
