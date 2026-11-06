import {
  availableAbilities,
  dispatch,
  enemyMaxHealth,
  registerScenario,
  type GameState,
  type Trigger,
} from '@lcg/engine'
import { choose, newTestGame } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { mirageDecks } from './fatal-mirage-decks'
import { fatalMirageExploration } from './fatal-mirage-exploration'
import { prepareMirageMap, PRISON_OF_MEMORIES } from './fatal-mirage-map'
import { evanescentMist } from './fatal-mirage-mist'

registerScenario(fatalMirageExploration)

function atMemory(location: string): GameState {
  const state = newTestGame({
    players: ['a', 'b'],
    scenario: {
      ...prepareMirageMap(2, new Set([location]), new Set()),
      ...mirageDecks(2),
      id: fatalMirageExploration.id,
      startingLocation: location,
    },
  })
  return dispatch(
    {
      ...state,
      queue: [],
      pending: null,
      activeTurn: 'a',
      investigators: state.investigators.map((i) => ({ ...i, clues: 2, actionsRemaining: 3 })),
    },
    { type: 'InitializeExpedition' },
  )
}

function explore(state: GameState) {
  const ability = availableAbilities(state, 'a').find(({ key }) => key.endsWith(':mirage'))!
  return dispatch(state, { ...ability, type: 'UseAbility', investigator: 'a' })
}

describe('Fatal Mirage terminal stories', () => {
  it.each([
    ['08567', '08575', '08716', 6, 3],
    ['08570', '08576', '08717', 8, 2],
    ['08566', '08577', '08722', 8, 1],
    ['08573', '08578', '08721', 6, 1],
    ['08569', '08579', '08714', 10, 2],
    ['08572', '08582', '08718', 8, 4],
    ['08571', '08583', '08720', 6, 2],
  ] as const)('spawns and resolves the memory at %s', (location, code, partner, health, damage) => {
    const spawned = explore(atMemory(location))
    const foe = Object.values(spawned.enemies)[0]!
    expect(foe).toMatchObject({ code, location })
    expect(enemyMaxHealth(spawned, foe)).toBe(health)
    const investigator = 'a'
    const triggers: Record<typeof code, Trigger> = {
      '08575': {
        type: 'afterSkillTest',
        investigator,
        enemy: foe.id,
        kind: 'evade',
        succeeded: true,
        margin: 3,
      },
      '08577': { type: 'afterGainResources', investigator, amount: 1 },
      '08578': { type: 'afterEnemyAttack', investigator, enemy: foe.id },
      '08576': { type: 'afterDamageHealed', investigator, amount: 2 },
      '08579': { type: 'afterCardsDrawn', investigator, amount: 2 },
      '08582': { type: 'enemyExhausted', enemy: foe.id },
      '08583': { type: 'afterDiscoverClues', investigator, location, amount: 2 },
    }
    // RR: "Reaction Triggered Abilities" and "Enemy Defeat".
    const exhausted: GameState = {
      ...spawned,
      enemies: { [foe.id]: { ...foe, exhausted: true } },
      treacheries: {
        mist: {
          ...evanescentMist,
          id: 'mist',
          owner: 'a',
          placement: { type: 'location', location },
        },
      },
    }
    const reacting = dispatch(exhausted, { type: 'Reactions', trigger: triggers[code] })
    const damaged = choose(reacting, 'choice.edgeOfTheEarth.mirageMemoryDamage')
    expect(damaged.enemies[foe.id]?.damageTaken).toBe(damage)
    const defeated = dispatch(damaged, { type: 'DefeatEnemy', enemy: foe.id, by: 'a' })
    expect(defeated.campaignLog?.expedition?.partners[partner]?.status).toBe('resolute')
    expect(defeated.victoryDisplay).toEqual([code + 'b'])
    expect(choose(defeated, 'choice.edgeOfTheEarth.mirageAdvance').outcome).toEqual({
      type: 'resolution',
      resolution: 1,
    })
  })

  it.each([
    { location: '08568', code: '08580', actions: 2, damage: 3 },
    { location: '08574', code: '08581', actions: 1, damage: 4 },
  ])(
    'pays the parley cost and damages $code without provoking an attack',
    ({ location, code, actions, damage }) => {
      // RR: "Parley" and "Costs".
      const spawned = explore({ ...atMemory(location), tekeliliDeck: ['08723', '08724', '08725'] })
      const foe = Object.values(spawned.enemies)[0]!
      expect(foe.code).toBe(code)
      const ability = availableAbilities(spawned, 'a').find(({ key }) =>
        key.endsWith(':memoryParley'),
      )!
      expect(ability).toMatchObject({ actions, provokes: false })
      const paid = dispatch(spawned, { ...ability, type: 'UseAbility', investigator: 'a' })
      expect(paid.enemies[foe.id]?.damageTaken).toBe(damage)
      expect(paid.investigators[0]?.actionsRemaining).toBe(2 - actions)
      if (code === '08580') expect(paid.tekeliliDeck).toEqual([])
      else expect(paid.chaosBag).toContain('frost')
    },
  )

  it('destroys the terminal location and returns investigators to the Prison if its partner is gone', () => {
    const eliminated = dispatch(atMemory('08566'), {
      type: 'SetExpeditionPartnerStatus',
      partner: '08722',
      status: 'eliminated',
    })
    const banished = explore(eliminated)
    expect(Object.values(banished.enemies)).toHaveLength(0)
    expect(banished.locations['08566']).toBeUndefined()
    expect(banished.investigators.map(({ location }) => location)).toEqual([
      PRISON_OF_MEMORIES,
      PRISON_OF_MEMORIES,
    ])
    expect(banished.victoryDisplay).toEqual(['08566b'])
  })
})
