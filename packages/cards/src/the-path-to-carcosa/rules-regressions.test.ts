import {
  createGame,
  getInvestigator,
  registerScenario,
  scenarioBehavior,
  type EnemyCard,
  type GameState,
} from '@lcg/engine'
import {
  choose,
  during,
  keep,
  testInvestigator,
  testScenario,
  throughSetup,
} from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import '../index'
import { encounterSpecific, ENCOUNTER_SETS, SETS } from './encounter-sets'
import { CODES, thePallidMask } from './the-pallid-mask'

const fixture = () =>
  throughSetup(
    createGame({
      seed: 1,
      interactive: true,
      investigators: [testInvestigator('a')],
      scenario: testScenario({ id: 'carcosa-regressions', chaosBag: [-3] }),
    }),
  )
registerScenario({
  id: 'carcosa-regressions',
  specific: (state, key, data) =>
    encounterSpecific(state, key, data) ??
    scenarioBehavior('the-pallid-mask')!.specific!(state, key, data),
  forced: (state, trigger) =>
    trigger.type === 'enemyEntersLocation'
      ? [
          { type: 'SetScenarioMeta', key: `visited:${trigger.location}`, value: 1 },
          ...(trigger.location === 'B' && state.scenarioMeta?.stopAtB
            ? [{ type: 'DiscardEnemy' as const, enemy: trigger.enemy }]
            : []),
        ]
      : [],
})

describe('Carcosa: complete printed effects', () => {
  it('Dance moves through every connecting location before engaging and attacking', () => {
    // 03097; RR Movement: resolve entering each location, not a teleport.
    const card = ENCOUNTER_SETS.hastursGift.find((c) => c.code === SETS.maniac) as EnemyCard
    let state = during(fixture(), keep, {
      type: 'SpawnEnemy',
      card,
      location: 'C',
      engageWith: null,
    })
    state = during(state, keep, {
      type: 'ScenarioSpecific',
      key: 'carcosaDance',
      data: { investigator: 'a' },
    })
    expect(state.scenarioMeta?.['visited:B']).toBe(1)
    expect(Object.values(state.enemies)[0]).toMatchObject({ location: 'A', engagedWith: 'a' })
  })

  it('Eyes in the Walls assigns the whole horror effect evenly before dealing it', () => {
    // 03260; RR Damage and Horror: divide as evenly as possible among eligible cards.
    let state = during(
      fixture(),
      keep,
      { type: 'PutAssetIntoPlay', investigator: 'a', code: '12058' },
      { type: 'PutAssetIntoPlay', investigator: 'a', code: '12061' },
    )
    const card = thePallidMask({ difficulty: 'standard', seed: 1 }).encounterDeck.find(
      (c) => c.code === CODES.eyesInTheWalls,
    )!
    state = during(state, keep, { type: 'ResolveEncounterCard', investigator: 'a', card })
    state = choose(choose(state, 'choice.revealToken'), 'choice.applyResults')
    state = choose(state, 'choice.assignToInvestigator')
    expect(
      state.pending?.question.choices.some((c) => c.label === 'choice.assignToInvestigator'),
    ).toBe(false)
    state = choose(state, 'choice.assignToAsset')
    expect(getInvestigator(state, 'a').horror).toBe(1)
    expect(Object.values(state.assets).map((a) => a.horror)).toEqual([1, 1])
  })

  it('Dance stops if an intermediate entry effect removes the enemy', () => {
    const card = ENCOUNTER_SETS.hastursGift.find((c) => c.code === SETS.maniac) as EnemyCard
    let state = during(fixture(), keep, {
      type: 'SpawnEnemy',
      card,
      location: 'C',
      engageWith: null,
    })
    state = during(state, (s) => ({ ...s, scenarioMeta: { ...s.scenarioMeta, stopAtB: 1 } }), {
      type: 'ScenarioSpecific',
      key: 'carcosaDance',
      data: { investigator: 'a' },
    })
    expect(Object.values(state.enemies)).toHaveLength(0)
    expect(getInvestigator(state, 'a').damage).toBe(0)
    expect(state.scenarioMeta?.['visited:A']).toBeUndefined()
  })

  it('Dance cannot teleport across disconnected locations', () => {
    const card = ENCOUNTER_SETS.hastursGift.find((c) => c.code === SETS.maniac) as EnemyCard
    let state = during(fixture(), keep, {
      type: 'SpawnEnemy',
      card,
      location: 'C',
      engageWith: null,
    })
    state = during(
      state,
      (s) => ({
        ...s,
        locations: Object.fromEntries(
          Object.entries(s.locations).map(([id, loc]) => [id, { ...loc, connections: [] }]),
        ),
      }),
      { type: 'ScenarioSpecific', key: 'carcosaDance', data: { investigator: 'a' } },
    )
    expect(Object.values(state.enemies)[0]?.location).toBe('C')
    expect(getInvestigator(state, 'a').damage).toBe(0)
  })

  it('Dance lets the lead choose between equally short routes', () => {
    const card = ENCOUNTER_SETS.hastursGift.find((c) => c.code === SETS.maniac) as EnemyCard
    let state = during(
      fixture(),
      (s) => ({
        ...s,
        locations: {
          ...s.locations,
          A: { ...s.locations.A!, connections: ['B', 'D'] },
          C: { ...s.locations.C!, connections: ['B', 'D'] },
          D: { ...s.locations.B!, id: 'D', name: 'Room D', connections: ['A', 'C'] },
        },
      }),
      { type: 'SpawnEnemy', card, location: 'C', engageWith: null },
    )
    state = during(state, keep, {
      type: 'ScenarioSpecific',
      key: 'carcosaDance',
      data: { investigator: 'a' },
    })
    expect(state.pending?.question.choices.map((c) => c.target)).toEqual([
      { type: 'location', id: 'B' },
      { type: 'location', id: 'D' },
    ])
    state = choose(state, 'choice.location', { location: 'Room D' })
    expect(state.scenarioMeta?.['visited:D']).toBe(1)
    expect(state.scenarioMeta?.['visited:B']).toBeUndefined()
    expect(getInvestigator(state, 'a').damage).toBe(2)
  })

  it('even horror respects remaining capacity and does not defeat cards during allocation', () => {
    let state = during(fixture(), keep, {
      type: 'PutAssetIntoPlay',
      investigator: 'a',
      code: '12058',
    })
    const asset = Object.values(state.assets)[0]!
    state = during(state, keep, { type: 'PutAssetIntoPlay', investigator: 'a', code: '12061' })
    state = during(
      state,
      (s) => ({ ...s, assets: { ...s.assets, [asset.id]: { ...asset, horror: 2 } } }),
      { type: 'TakeDamage', investigator: 'a', damage: 0, horror: 4, evenly: true },
    )
    state = choose(state, 'choice.assignToAsset')
    expect(state.assets[asset.id]?.horror).toBe(2)
    expect(
      state.pending?.question.choices.some(
        (c) => c.target?.type === 'asset' && c.target.id === asset.id,
      ),
    ).toBe(false)
    state = choose(state, 'choice.assignToInvestigator')
    state = choose(state, 'choice.assignToInvestigator')
    expect(state.assets[asset.id]).toBeUndefined()
    expect(getInvestigator(state, 'a').horror).toBe(2)
  })

  it('direct horror overrides even assignment; without assets the whole effect is received', () => {
    const take = (state: GameState, direct = false) =>
      during(state, keep, {
        type: 'TakeDamage',
        investigator: 'a',
        damage: 0,
        horror: 3,
        evenly: true,
        direct,
      })
    expect(getInvestigator(take(fixture()), 'a').horror).toBe(3)
    const state = take(
      during(fixture(), keep, { type: 'PutAssetIntoPlay', investigator: 'a', code: '12058' }),
      true,
    )
    expect(getInvestigator(state, 'a').horror).toBe(3)
    expect(Object.values(state.assets)[0]?.horror).toBe(0)
  })
})
