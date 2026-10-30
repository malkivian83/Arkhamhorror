// RR: Dealing Damage/Horror, Direct Damage, Triggered Abilities.
import { createGame, dispatch, registerScenario } from './index'
import { testInvestigator, testScenario } from './testing'
import { expect, it } from 'vitest'
registerScenario({
  id: 'generic-damage-window',
  forced: (s, t) =>
    t.type === 'whenDealtDamage'
      ? [
          {
            type: 'SetScenarioMeta',
            key: 'windows',
            value: Number(s.scenarioMeta?.windows ?? 0) + 1,
          },
          { type: 'ReducePendingDamage', investigator: t.investigator, damage: 1, horror: 1 },
        ]
      : [],
})
it.each([false, true])('opens one window for non-enemy damage, including direct=%s', (direct) => {
  const base = createGame({
    seed: 1,
    scenario: testScenario({ id: 'generic-damage-window' }),
    investigators: [testInvestigator('a')],
  })
  const s = dispatch(
    { ...base, pending: null, queue: [] },
    { type: 'TakeDamage', investigator: 'a', damage: 2, horror: 1, direct },
  )
  expect(s.investigators[0]!.damage).toBe(1)
  expect(s.investigators[0]!.horror).toBe(0)
  expect(s.scenarioMeta?.windows).toBe(1)
})
it('does not reopen the window while applying an already assigned point', () => {
  const base = createGame({
    seed: 1,
    scenario: testScenario({ id: 'generic-damage-window' }),
    investigators: [testInvestigator('a')],
  })
  const s = dispatch(
    { ...base, pending: null, queue: [] },
    {
      type: 'TakeDamage',
      investigator: 'a',
      damage: 1,
      horror: 0,
      direct: true,
      assignmentPart: true,
    },
  )
  expect(s.investigators[0]!.damage).toBe(1)
  expect(s.scenarioMeta?.windows).toBeUndefined()
})
