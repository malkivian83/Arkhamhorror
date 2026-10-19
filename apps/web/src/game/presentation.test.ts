import { createGame } from '@lcg/engine'
import {
  choose,
  during,
  ghoul,
  testInvestigator,
  testScenario,
  throughSetup,
} from '@lcg/engine/testing'
import '@lcg/cards'
import { describe, expect, it } from 'vitest'
import { choiceTarget } from './choiceTarget'

function table() {
  return throughSetup(
    createGame({
      seed: 8,
      interactive: true,
      scenario: testScenario(),
      investigators: [testInvestigator('a', { deck: Array(30).fill('12089') })],
    }),
  )
}

describe('presentación de apoyos en las pruebas', () => {
  it('Aguante se asocia a su apoyo y paga +2 de agilidad durante una evasión real', () => {
    let state = during(
      table(),
      (s) => s,
      { type: 'PutAssetIntoPlay', investigator: 'a', code: '12017' },
      { type: 'SpawnEnemy', card: ghoul, location: 'A', engageWith: 'a' },
    )
    state = choose(state, 'action.evade')
    const asset = Object.values(state.assets).find((a) => a.code === '12017')!
    const option = state.pending!.question.choices.find((c) => c.label === 'ability.pump')!
    const before = JSON.stringify(state)
    expect(choiceTarget(state, option)).toEqual({ type: 'asset', id: asset.id })
    expect(JSON.stringify(state)).toBe(before)
    const resources = state.investigators[0]!.resources
    const actions = state.investigators[0]!.actionsRemaining
    state = choose(state, 'ability.pump', { skill: 'agility', amount: 2 })
    expect(state.skillTest?.baseModifier).toBe(2)
    expect(state.investigators[0]!.resources).toBe(resources - 1)
    expect(state.investigators[0]!.actionsRemaining).toBe(actions)
    expect(state.skillTest?.tokens).toEqual([])
  })
  it('no inventa un botón de Aguante cuando está en la mano o no quedan recursos', () => {
    for (const inPlay of [false, true]) {
      let state = during(
        table(),
        (s) => ({
          ...s,
          investigators: s.investigators.map((i) => ({
            ...i,
            hand: ['12017'],
            resources: inPlay ? 0 : 5,
          })),
        }),
        ...(inPlay
          ? [{ type: 'PutAssetIntoPlay' as const, investigator: 'a', code: '12017' }]
          : []),
        { type: 'SpawnEnemy', card: ghoul, location: 'A', engageWith: 'a' },
      )
      state = choose(state, 'action.evade')
      expect(state.pending!.question.choices.some((c) => c.label === 'ability.pump')).toBe(false)
    }
  })
})
