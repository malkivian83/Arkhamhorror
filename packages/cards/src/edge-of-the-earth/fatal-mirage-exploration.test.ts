import { availableAbilities, dispatch, registerScenario } from '@lcg/engine'
import { choose, newTestGame } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { fatalMirageExploration } from './fatal-mirage-exploration'
import { prepareMirageMap, PRISON_OF_MEMORIES } from './fatal-mirage-map'

registerScenario(fatalMirageExploration)

function atPrison() {
  const map = prepareMirageMap(2, new Set(['08562']), new Set())
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
    queue: [],
    pending: null,
    investigators: state.investigators.map((investigator) => ({ ...investigator, clues: 1 })),
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
    expect(ability).toMatchObject({ actions: 0, provokes: false })
    const choosing = dispatch(state, { ...ability, type: 'UseAbility', investigator: 'a' })
    expect(choosing.investigators.map(({ clues }) => clues)).toEqual([0, 0])
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
