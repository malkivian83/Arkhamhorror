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
    expect(s.agendaIndex).toBe(checkAgenda === false ? 0 : 1)
    expect(s.assets.tome!.doom).toBe(checkAgenda === false ? 3 : 0)
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
