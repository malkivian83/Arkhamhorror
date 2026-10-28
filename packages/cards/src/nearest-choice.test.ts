import {
  createGame,
  registerScenario,
  treacheryBehavior,
  type GameState,
  type Treachery,
} from '@lcg/engine'
import {
  choose,
  during,
  ghoul,
  keep,
  testInvestigator,
  testScenario,
  throughSetup,
} from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import './index'
import { QUESTIONING, SPOTLIGHTS, PART_TWO_CODES } from './fortune-and-folly/cards'
import { commonSpecific } from './fortune-and-folly/common'
import { runSpecific } from './excelsior/helpers'

registerScenario({
  id: 'nearest-regressions',
  specific: (s, key, data) => commonSpecific(s, key, data) ?? runSpecific(s, key, data),
  forced: (s, trigger) =>
    trigger.type === 'enemyEntersLocation'
      ? [
          { type: 'SetScenarioMeta', key: 'visited:' + trigger.location, value: 1 },
          ...(s.scenarioMeta?.stop && trigger.location === 'C'
            ? [{ type: 'DiscardEnemy' as const, enemy: trigger.enemy }]
            : []),
        ]
      : [],
})
function fixture(): GameState {
  let s = throughSetup(
    createGame({
      seed: 1,
      interactive: true,
      investigators: [testInvestigator('a'), testInvestigator('b')],
      scenario: testScenario({ id: 'nearest-regressions', chaosBag: [0] }),
    }),
  )
  if (s.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    s = choose(s, 'choice.investigator', { name: 'A' })
  return {
    ...s,
    leadInvestigatorId: 'b',
    locations: {
      A: { ...s.locations.A!, connections: ['B', 'C'] },
      B: { ...s.locations.B!, connections: ['A', 'D'] },
      C: { ...s.locations.C!, connections: ['A', 'D'] },
      D: { ...s.locations.C!, id: 'D', name: 'Room D', connections: ['B', 'C'] },
    },
  }
}
function spawn(
  s: GameState,
  name: string,
  location: string,
  traits = ['Casino', 'Humanoid'],
): GameState {
  return during(s, keep, {
    type: 'SpawnEnemy',
    card: { ...ghoul, name, traits, keywords: ['aloof'] },
    location,
    engageWith: null,
  })
}
function reveal(s: GameState, code: string): GameState {
  const card: Treachery = {
    kind: 'treachery',
    code,
    name: code,
    keywords: [],
    id: code,
    placement: { type: 'limbo' },
  }
  return during(
    s,
    (g) => ({ ...g, treacheries: { ...g.treacheries, [code]: card } }),
    ...treacheryBehavior(code)!.revelation(s, 'a', card),
  )
}
const targets = (s: GameState) =>
  s.pending?.question.choices.map((c) => (c.target && 'id' in c.target ? c.target.id : undefined))

describe('RR Nearest/Farthest and Movement: player resolves ties', () => {
  it.each([...QUESTIONING, '12163'])(
    '%s selects either nearest eligible enemy, not a farther enemy',
    (code) => {
      let s = spawn(spawn(spawn(fixture(), 'First', 'B'), 'Second', 'C'), 'Far', 'D')
      const second = Object.values(s.enemies).find((e) => e.name === 'Second')!
      s = reveal(s, code)
      expect(s.pending?.investigator).toBe('b')
      expect(s.pending?.question.choices.map((c) => c.params?.enemy)).toEqual(['First', 'Second'])
      s = choose(s, 'choice.enemy', { enemy: 'Second' })
      expect(s.enemies[second.id]?.location).toBe('A')
      expect(Object.values(s.enemies).find((e) => e.name === 'First')?.location).toBe('B')
      if (QUESTIONING.includes(code)) expect(s.skillTest).toBeDefined()
    },
  )
  it.each([...SPOTLIGHTS, ...PART_TWO_CODES.hypnosis])(
    '%s chooses among equally near legal locations',
    (code) => {
      let s = fixture()
      s.treacheries.existing = {
        kind: 'treachery',
        id: 'existing',
        code,
        name: code,
        keywords: [],
        placement: { type: 'location', location: 'A' },
      }
      s = reveal(s, code)
      expect(s.pending?.investigator).toBe('b')
      expect(targets(s)).toEqual(['B', 'C'])
      s = choose(s, 'choice.location', { location: 'Room C' })
      expect(s.treacheries[code]?.placement).toEqual({ type: 'location', location: 'C' })
    },
  )
  it('tablet lets the lead select the enemy and does not attack', () => {
    let s = spawn(spawn(fixture(), 'First', 'B'), 'Second', 'C')
    s = during(s, keep, {
      type: 'ScenarioSpecific',
      key: 'fofNearestMoves',
      data: { investigator: 'a' },
    })
    expect(s.pending?.investigator).toBe('b')
    s = choose(s, 'choice.enemy', { enemy: 'Second' })
    expect(Object.values(s.enemies).find((e) => e.name === 'Second')?.location).toBe('A')
    expect(s.investigators[0]!.damage).toBe(0)
  })
  it('forced movement of an exhausted enemy offers both shortest paths', () => {
    let s = spawn(fixture(), 'Mover', 'D')
    const enemy = Object.keys(s.enemies)[0]!
    s = during(
      s,
      (g) => ({
        ...g,
        enemies: { ...g.enemies, [enemy]: { ...g.enemies[enemy]!, exhausted: true } },
      }),
      { type: 'HuntOnce', enemy, toward: 'A', attack: false },
    )
    expect(targets(s)).toEqual(['B', 'C'])
    expect(s.pending?.investigator).toBe('b')
    s = choose(s, 'choice.location', { location: 'Room C' })
    expect(s.enemies[enemy]).toMatchObject({ location: 'C', exhausted: true })
    expect(s.scenarioMeta?.['visited:C']).toBe(1)
  })
  it('Aerial Pursuit excludes Elite enemies and attacks after engagement', () => {
    let s = spawn(spawn(fixture(), 'Elite', 'A', ['Elite']), 'Attacker', 'B')
    const enemy = Object.values(s.enemies).find((e) => e.name === 'Attacker')!
    s.enemies[enemy.id] = { ...enemy, keywords: [] }
    s.investigators = s.investigators.map((i) => (i.id === 'b' ? { ...i, location: 'D' } : i))
    s = reveal(s, '12163')
    expect(s.enemies[enemy.id]).toMatchObject({ location: 'A', engagedWith: 'a' })
    expect(s.investigators[0]).toMatchObject({ damage: 1, horror: 1 })
  })
  it('ties include two enemies at the same location', () => {
    let s = spawn(spawn(fixture(), 'First', 'B'), 'Second', 'B')
    s = reveal(s, QUESTIONING[0]!)
    expect(s.pending?.question.choices.map((c) => c.params?.enemy)).toEqual(['First', 'Second'])
  })
  it('forced movement does nothing when there is no connecting path', () => {
    let s = spawn(fixture(), 'Stranded', 'D')
    const enemy = Object.keys(s.enemies)[0]!
    s = during(
      s,
      (g) => ({ ...g, locations: { ...g.locations, D: { ...g.locations.D!, connections: [] } } }),
      { type: 'HuntOnce', enemy, toward: 'A' },
    )
    expect(s.enemies[enemy]?.location).toBe('D')
    expect(s.investigators[0]!.damage).toBe(0)
    expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
  })
  it.each([false, true])(
    'Outburst resolves each step and stops when its enemy leaves play: %s',
    (stop) => {
      let s = spawn(fixture(), 'Mover', 'D')
      s.scenarioMeta = { ...s.scenarioMeta, stop: stop ? 1 : 0 }
      s = reveal(s, '84027')
      expect(targets(s)).toEqual(['B', 'C'])
      s = choose(s, 'choice.location', { location: 'Room C' })
      expect(s.scenarioMeta?.['visited:C']).toBe(1)
      if (stop) {
        expect(Object.values(s.enemies)).toHaveLength(0)
        expect(s.scenarioMeta?.['visited:A']).toBeUndefined()
        expect(s.investigators[0]!.damage).toBe(0)
      } else {
        expect(s.scenarioMeta?.['visited:A']).toBe(1)
        expect(Object.values(s.enemies)[0]).toMatchObject({ location: 'A', engagedWith: 'a' })
        expect(s.investigators[0]).toMatchObject({ damage: 1, horror: 1 })
      }
    },
  )
})
