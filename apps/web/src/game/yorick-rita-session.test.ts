// RR: Saving pending decisions preserves the physical event in limbo and its source.
import { expect, it } from 'vitest'
import { newCampaign, startScenario } from '@lcg/cards'
import { applyInput, dispatch } from '@lcg/engine'
import { throughSetup } from '@lcg/engine/testing'
import { decodeSession, session } from './session'
import { markOf } from './undo'

it('round-trips an event still resolving through a real saved session', () => {
  const initial = throughSetup(
    startScenario(newCampaign('night-of-the-zealot', ['yorick', 'rita'], 'standard'), 3, true),
  )
  const by = initial.investigators[0]!.id
  const ready = {
    ...initial,
    pending: null,
    queue: [],
    investigators: initial.investigators.map((i) => ({ ...i, hand: i.id === by ? ['01064'] : [] })),
    encounterDeck: [
      { kind: 'treachery' as const, code: '01163', name: 'Rotting Remains', keywords: [] },
    ],
  }
  const pending = dispatch(ready, {
    type: 'PlayCard',
    investigator: by,
    code: '01064',
    byEffect: true,
  })
  expect(pending.resolvingPlayerEvents).toHaveLength(1)
  expect(pending.pending).not.toBeNull()
  const restored = decodeSession(
    JSON.stringify(session(pending, { base: pending, inputs: [], marks: [markOf(pending)] }, null)),
  ).state!
  expect(restored).toEqual(pending)
  const input = { investigator: pending.pending!.investigator, choice: 0 }
  expect(applyInput(restored, input)).toEqual(applyInput(pending, input))
})
