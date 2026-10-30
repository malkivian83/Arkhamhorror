import { createGame, registerPlayerCard, registerPlayerCards, registerScenario } from './index'
import { choose, during, testInvestigator, testScenario } from './testing'
import { describe, expect, it } from 'vitest'
import type { GameState } from './types'

const code = 'assignment-ally'
registerPlayerCards([
  {
    code,
    name: 'Assignment Ally',
    type: 'asset',
    class: 'neutral',
    traits: ['Ally'],
    health: 2,
    sanity: 2,
  },
])
registerPlayerCard({ code, soaksAtLocation: true })
registerScenario({
  id: 'simultaneous-assignment',
  simultaneousAssetAssignment: true,
  forced: (_s, t) =>
    t.type === 'afterAssetDamaged'
      ? [
          { type: 'SetScenarioMeta', key: 'reportedDamage', value: t.damage },
          { type: 'SetScenarioMeta', key: 'reportedHorror', value: t.horror },
        ]
      : [],
})
const game = () =>
  createGame({
    seed: 1,
    scenario: testScenario({ id: 'simultaneous-assignment' }),
    investigators: [testInvestigator('a')],
  })
function assign(s: GameState) {
  while (
    s.pending?.question.prompt === 'prompt.assignDamage' ||
    s.pending?.question.prompt === 'prompt.assignHorror'
  ) {
    const asset = s.pending.question.choices.some((c) => c.label === 'choice.assignToAsset')
    s = choose(s, asset ? 'choice.assignToAsset' : 'choice.assignToInvestigator')
  }
  return s
}

// RR "Dealing Damage/Horror": assign both kinds, then apply and check defeat.
describe('Asignación conjunta a apoyos', () => {
  it('llena salud y cordura antes de derrotarlo y notifica el efecto completo una sola vez', () => {
    let s = during(game(), (x) => x, { type: 'PutAssetIntoPlay', code, investigator: 'a' })
    s = assign(during(s, (x) => x, { type: 'TakeDamage', investigator: 'a', damage: 2, horror: 2 }))
    expect(s.investigators[0]?.damage).toBe(0)
    expect(s.investigators[0]?.horror).toBe(0)
    expect(Object.values(s.assets)).toHaveLength(0)
    expect(s.scenarioMeta).toMatchObject({ reportedDamage: 2, reportedHorror: 2 })
    expect(s.investigators[0]?.discard.filter((c) => c === code)).toHaveLength(1)
  })
  it('finaliza la derrota del apoyo también cuando el exceso va directamente al investigador', () => {
    let s = during(game(), (x) => x, { type: 'PutAssetIntoPlay', code, investigator: 'a' })
    s = assign(during(s, (x) => x, { type: 'TakeDamage', investigator: 'a', damage: 2, horror: 3 }))
    expect(s.investigators[0]?.horror).toBe(1)
    expect(Object.values(s.assets)).toHaveLength(0)
    expect(s.scenarioMeta).toMatchObject({ reportedDamage: 2, reportedHorror: 2 })
  })
  it('los apoyos sin dueño permitidos absorben ambos tipos antes de retirarse', () => {
    let s = during(game(), (x) => x, {
      type: 'PlaceAsset',
      code,
      name: 'Assignment Ally',
      placement: { type: 'location', location: 'A' },
    })
    s = assign(during(s, (x) => x, { type: 'TakeDamage', investigator: 'a', damage: 2, horror: 2 }))
    expect(s.investigators[0]?.damage).toBe(0)
    expect(s.investigators[0]?.horror).toBe(0)
    expect(Object.values(s.placedAssets ?? {})).toHaveLength(0)
  })
})
