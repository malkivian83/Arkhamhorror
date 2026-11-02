import {
  applyInput,
  createGame,
  registerPlayerCard,
  registerPlayerCards,
  type GameState,
} from '@lcg/engine'
import { during, testInvestigator, testScenario, throughSetup } from '@lcg/engine/testing'
import { newCampaign, startScenario } from '@lcg/cards'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { accountStorage } from '../account/storage'
import { useGameStore } from '../stores/game'
import { assignmentOf, emptyPlan, movePoint, planPicker } from './damagePlan'
import { session } from './session'
import { markOf } from './undo'

const ally = 'damage-plan-ally'
registerPlayerCards([
  {
    code: ally,
    name: 'Plan Ally',
    type: 'asset',
    class: 'neutral',
    traits: ['Ally'],
    health: 2,
    sanity: 2,
  },
])
registerPlayerCard({ code: ally })

/** Investigator "a" with the ally in play, asked to assign 2 damage and 2 horror. */
function hit(): GameState {
  let s = createGame({ seed: 1, scenario: testScenario(), investigators: [testInvestigator('a')] })
  s = during(s, (x) => x, { type: 'PutAssetIntoPlay', code: ally, investigator: 'a' })
  return during(s, (x) => x, { type: 'TakeDamage', investigator: 'a', damage: 2, horror: 2 })
}
const allyId = (s: GameState) => Object.values(s.assets).find((a) => a.code === ally)!.id

describe('reparto de daño y horror de una vez (doc 100, D4)', () => {
  it('lee lo que queda por asignar y quién puede recibirlo', () => {
    const s = hit()
    const assignment = assignmentOf(s)!
    expect(assignment).toMatchObject({ investigator: 'a', damage: 2, horror: 2 })
    expect(assignment.recipients.map((r) => r.target)).toEqual([
      { type: 'investigator', id: 'a' },
      { type: 'asset', id: allyId(s) },
    ])
    expect(assignment.recipients[1]!.room).toEqual({ damage: 2, horror: 2 })
  })

  it('solo mueve puntos entre el investigador y un apoyo con hueco', () => {
    const s = hit()
    const assignment = assignmentOf(s)!
    const key = assignment.recipients[1]!.key
    let plan = emptyPlan(assignment)
    expect(movePoint(assignment, plan, key, 'damage', -1)).toBe(plan)
    plan = movePoint(assignment, plan, key, 'damage', 1)
    plan = movePoint(assignment, plan, key, 'damage', 1)
    expect(movePoint(assignment, plan, key, 'damage', 1)).toBe(plan)
    expect(plan.damage).toEqual({ 'investigator:a': 0, [key]: 2 })
  })

  it('un apoyo derrotado por el daño ya no recibe horror, porque el motor asigna antes el daño', () => {
    const s = hit()
    const assignment = assignmentOf(s)!
    const key = assignment.recipients[1]!.key
    let plan = emptyPlan(assignment)
    plan = movePoint(assignment, plan, key, 'damage', 1)
    plan = movePoint(assignment, plan, key, 'damage', 1)
    expect(movePoint(assignment, plan, key, 'horror', 1)).toBe(plan)
    plan = movePoint(assignment, plan, key, 'damage', -1)
    plan = movePoint(assignment, plan, key, 'horror', 1)
    expect(movePoint(assignment, plan, key, 'damage', 1)).toBe(plan)
    expect(plan).toEqual({
      damage: { 'investigator:a': 1, [key]: 1 },
      horror: { 'investigator:a': 1, [key]: 1 },
    })
  })

  it('el plan responde cada pregunta del motor y deja el reparto elegido', () => {
    let s = hit()
    const assignment = assignmentOf(s)!
    const key = assignment.recipients[1]!.key
    let plan = emptyPlan(assignment)
    plan = movePoint(assignment, plan, key, 'damage', 1)
    plan = movePoint(assignment, plan, key, 'horror', 1)
    const pick = planPicker('a', plan)
    for (let index = pick(s); index !== null; index = pick(s))
      s = applyInput(s, { investigator: 'a', choice: index })
    expect(s.pending?.question.prompt).not.toMatch(/^prompt\.assign/)
    expect(s.investigators[0]).toMatchObject({ damage: 1, horror: 1 })
    expect(Object.values(s.assets)[0]).toMatchObject({ damage: 1, horror: 1 })
  })
})

describe('respuestas encadenadas en el almacén', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) })
    vi.stubGlobal('document', { visibilityState: 'visible' })
    accountStorage.clear()
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    })
    setActivePinia(createPinia())
  })
  afterEach(() => vi.unstubAllGlobals())

  it('aplica todo el reparto en una sola actualización y lo guarda en el historial', () => {
    const gala = throughSetup(
      startScenario(newCampaign('the-midwinter-gala', ['joe'], 'standard'), 13),
    )
    const joe = gala.investigators[0]!.id
    let s = during(gala, (x) => x, { type: 'PutAssetIntoPlay', code: ally, investigator: joe })
    s = during(s, (x) => x, { type: 'TakeDamage', investigator: joe, damage: 2, horror: 2 })
    const game = useGameStore()
    const history = { base: s, inputs: [], marks: [markOf(s)] }
    expect(game.importSession(JSON.stringify(session(s, history, null)))).toBe(true)
    const assignment = assignmentOf(game.state)!
    const plan = movePoint(
      assignment,
      emptyPlan(assignment),
      assignment.recipients[1]!.key,
      'horror',
      1,
    )
    game.answerSequence(planPicker(joe, plan))
    expect(game.error).toBeNull()
    expect(game.state!.investigators[0]).toMatchObject({ damage: 2, horror: 1 })
    const saved = JSON.parse(game.exportSession()) as ReturnType<typeof session>
    expect(saved.history!.inputs).toHaveLength(4)
    expect(saved.history!.marks).toHaveLength(5)
    // Undoing one step goes back one point, as with answers given one by one.
    game.undo('step')
    expect(assignmentOf(game.state)).toMatchObject({ damage: 0, horror: 1 })
  })
})
