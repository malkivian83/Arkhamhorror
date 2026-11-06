import { availableAbilities, dispatch, enemyHasKeyword, registerScenario } from '@lcg/engine'
import { choose, newTestGame } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { fatalMirageExploration } from './fatal-mirage-exploration'
import { prepareMirageMap, PRISON_OF_MEMORIES } from './fatal-mirage-map'
import { evanescentMist } from './fatal-mirage-mist'
import { horrifyingShade } from './fatal-mirage-shade'

registerScenario(fatalMirageExploration)

function atPrison(restored = ['08562'], clues = 1) {
  const map = prepareMirageMap(2, new Set(restored), new Set())
  const state = newTestGame({
    players: ['a', 'b'],
    scenario: {
      ...map,
      id: fatalMirageExploration.id,
      startingLocation: PRISON_OF_MEMORIES,
    },
  })
  return {
    ...state,
    activeTurn: 'a',
    queue: [],
    pending: null,
    investigators: state.investigators.map((investigator) => ({
      ...investigator,
      actionsRemaining: 3,
      clues,
    })),
  }
}

describe('Mirage location branches', () => {
  it('takes clues only from investigators at the revealed Mirage location', () => {
    const state = atPrison()
    const split = {
      ...state,
      investigators: state.investigators.map((investigator) =>
        investigator.id === 'b' ? { ...investigator, location: '08562', clues: 5 } : investigator,
      ),
    }
    expect(availableAbilities(split, 'a').some(({ key }) => key.endsWith(':mirage'))).toBe(false)
    const hidden = {
      ...state,
      locations: {
        ...state.locations,
        [PRISON_OF_MEMORIES]: { ...state.locations[PRISON_OF_MEMORIES]!, revealed: false },
      },
    }
    expect(availableAbilities(hidden, 'a').some(({ key }) => key.endsWith(':mirage'))).toBe(false)
  })

  it('pays the group cost, chooses one branch and places it revealed with reduced clues', () => {
    const state = atPrison()
    const ability = availableAbilities(state, 'a').find(({ key }) => key === '08556:mirage')!
    expect(ability).toMatchObject({ actions: 1, provokes: true })
    const choosing = dispatch(state, { ...ability, type: 'UseAbility', investigator: 'a' })
    expect(choosing.investigators.map(({ clues }) => clues)).toEqual([0, 0])
    expect(choosing.investigators[0]?.actionsRemaining).toBe(2)
    expect(choosing.pending?.question.choices.map(({ params }) => params?.location)).toEqual([
      'Base Camp',
      'Deck of the Theodosia',
      'University Halls',
    ])
    const discovered = choose(choosing, 'choice.location', { location: 'Base Camp' })
    expect(discovered.locations['08557']).toMatchObject({ revealed: true, clueValue: 2, clues: 4 })
    expect(discovered.locations[PRISON_OF_MEMORIES]?.connections).toContain('08557')
    expect(discovered.setAsideLocations['08557']).toBeUndefined()
    expect(discovered.setAsideLocations['08558']).toBeDefined()
  })
})

describe('Horrifying Shade', () => {
  function spawnShade(state: ReturnType<typeof atPrison>) {
    return dispatch(state, {
      type: 'SpawnEnemy',
      card: horrifyingShade,
      location: PRISON_OF_MEMORIES,
      engageWith: null,
    })
  }

  it('gains doom for clues actually discovered at its location', () => {
    // RR: "Clues" and "Forced Abilities".
    let state = spawnShade(atPrison())
    state = dispatch(state, {
      type: 'DiscoverClues',
      investigator: 'a',
      location: '08562',
      amount: 1,
    })
    expect(Object.values(state.enemies)[0]?.doom ?? 0).toBe(0)
    state = dispatch(state, { type: 'DiscoverClues', investigator: 'a', amount: 2 })
    expect(Object.values(state.enemies)[0]?.doom).toBe(2)
  })

  it('counts the clues taken into control even without a discovery', () => {
    // RR: "Clues" and "Forced Abilities".
    const state = spawnShade(atPrison(['08557', '08558']))
    const moved = dispatch(state, {
      type: 'MoveClues',
      from: { type: 'location', id: PRISON_OF_MEMORIES },
      to: { type: 'investigator', id: 'a' },
      amount: 3,
    })
    expect(moved.investigators[0]?.clues).toBe(3)
    expect(Object.values(moved.enemies)[0]?.doom).toBe(2)
  })

  it('loses aloof and engages when the last branch is explored', () => {
    // RR: "Aloof" and "Enemy Engagement".
    const spawned = spawnShade(atPrison(['08557', '08558']))
    const shade = Object.values(spawned.enemies)[0]!
    expect(enemyHasKeyword(spawned, shade, 'aloof')).toBe(true)
    expect(shade.engagedWith).toBeNull()
    const ability = availableAbilities(spawned, 'a').find(({ key }) => key === '08556:mirage')!
    const explored = dispatch(spawned, { ...ability, type: 'UseAbility', investigator: 'a' })
    const engaged = explored.enemies[shade.id]!
    expect(enemyHasKeyword(explored, engaged, 'aloof')).toBe(false)
    expect(enemyHasKeyword(explored, engaged, 'hunter')).toBe(true)
    expect(engaged.engagedWith).toBeTruthy()
  })
})

describe('Evanescent Mist', () => {
  it.each([
    { startingClues: 2, label: 'mistClues', damage: 0 },
    { startingClues: 1, label: 'mistDamage', damage: 2 },
  ])(
    'attaches, adds clues and charges $label until its location is cleared',
    ({ startingClues, label, damage }) => {
      // RR: "Attach To", "Costs" and "Forced Abilities".
      const state = atPrison(['08557', '08558'], startingClues)
      const drawn = dispatch(
        { ...state, encounterDeck: [evanescentMist] },
        { type: 'DrawEncounterCard', investigator: 'a' },
      )
      expect(Object.values(drawn.treacheries)[0]?.placement).toEqual({
        type: 'location',
        location: PRISON_OF_MEMORIES,
      })
      expect(drawn.locations[PRISON_OF_MEMORIES]?.clues).toBe(
        state.locations[PRISON_OF_MEMORIES]!.clues + 2,
      )
      const ability = availableAbilities(drawn, 'a').find(({ key }) => key === '08556:mirage')!
      let exploring = dispatch(drawn, { ...ability, type: 'UseAbility', investigator: 'a' })
      while (exploring.pending?.question.prompt === 'prompt.whoPaysClue') {
        const choice = exploring.pending.question.choices[0]!
        exploring = choose(exploring, choice.label, choice.params)
      }
      let explored = exploring
      if (startingClues === 2) {
        expect(exploring.pending?.question.choices.map(({ label }) => label)).toEqual([
          'choice.edgeOfTheEarth.mistClues',
          'choice.edgeOfTheEarth.mistDamage',
        ])
        explored = choose(exploring, 'choice.edgeOfTheEarth.' + label)
      } else {
        expect(exploring.pending).toBeNull()
      }
      while (explored.pending?.question.prompt === 'prompt.whoPaysClue') {
        const choice = explored.pending.question.choices[0]!
        explored = choose(explored, choice.label, choice.params)
      }
      expect(explored.investigators.map((i) => [i.clues, i.damage])).toEqual([
        [0, damage],
        [0, damage],
      ])
      expect(explored.locations['08559']?.revealed).toBe(true)
      expect(Object.values(explored.treacheries)).toEqual([])
      expect(explored.encounterDiscard).toContainEqual(evanescentMist)
    },
  )
})
