// RR: ST.2/ST.8: physical beneath commitments and temporary icons survive a saved game.
import { expect, it } from 'vitest'
import { newCampaign, startScenario } from '@lcg/cards'
import { applyInput, dispatch, type GameState } from '@lcg/engine'
import { throughSetup } from '@lcg/engine/testing'
import { decodeSession, session } from './session'
import { markOf } from './undo'
it('restores the exact beneath copy and its icon multiplier without changing the next choice', () => {
  const base = throughSetup(
    startScenario(newCampaign('night-of-the-zealot', ['amanda'], 'standard', 3), 3, true),
  )
  const ready: GameState = {
    ...base,
    pending: null,
    queue: [],
    interactive: true,
    investigators: base.investigators.map((i) => ({ ...i, hand: ['01093'], beneath: ['01093'] })),
  }
  let s = dispatch(ready, {
    type: 'BeginSkillTest',
    investigator: '07002',
    skill: 'intellect',
    difficulty: 2,
    kind: { type: 'effect', source: 'Amanda test', onSuccess: [], onFail: [], onFailEach: [] },
  })
  const pending = s.pending
  s = dispatch(
    { ...s, pending: null, queue: [] },
    { type: 'DoubleBeneathIcons', investigator: '07002' },
  )
  s = { ...s, pending, queue: [] }
  expect(s.skillTest!.committed[0]).toMatchObject({
    code: '01093',
    fromBeneath: 0,
    iconMultiplier: 2,
  })
  const loaded = decodeSession(
    JSON.stringify(session(s, { base: s, inputs: [], marks: [markOf(s)] }, null)),
  ).state!
  expect(loaded).toEqual(s)
  const input = { investigator: s.pending!.investigator, choice: 0 }
  expect(applyInput(loaded, input)).toEqual(applyInput(s, input))
})
