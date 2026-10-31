// RR: Doom. Only an explicit threshold check can advance an agenda outside its normal step.
import { expect, it } from 'vitest'
import { createGame, dispatch } from './index'
import { testInvestigator, testScenario } from './testing'
it.each([true, false, undefined])(
  'asset doom preserves the explicit checkAgenda=%s contract',
  (checkAgenda) => {
    const base = createGame({
      seed: 1,
      scenario: testScenario(),
      investigators: [testInvestigator('a')],
    })
    const s = dispatch(
      {
        ...base,
        pending: null,
        queue: [],
        assets: {
          tome: {
            id: 'tome',
            code: 'test-tome',
            owner: 'a',
            damage: 0,
            horror: 0,
            exhausted: false,
            uses: 0,
            doom: 2,
          },
        },
      },
      {
        type: 'PlaceDoomOnAsset',
        asset: 'tome',
        amount: 1,
        ...(checkAgenda !== undefined ? { checkAgenda } : {}),
      },
    )
    // RR 1.3: without an explicit check the agenda waits for the mythos phase.
    expect(s.agendaIndex).toBe(checkAgenda === true ? 1 : 0)
    expect(s.assets.tome!.doom).toBe(checkAgenda === true ? 0 : 3)
  },
)
it('doom that becomes damage still follows the scenario replacement', () => {
  const base = createGame({
    seed: 1,
    scenario: testScenario(),
    investigators: [testInvestigator('a')],
  })
  const s = dispatch(
    { ...base, pending: null, queue: [], doomBecomesDamage: true },
    { type: 'PlaceDoomOnAsset', asset: 'not-in-play', amount: 1, checkAgenda: false },
  )
  expect(s.agendaIndex).toBe(0)
  expect(s.investigators[0]!.damage).toBe(1)
})
