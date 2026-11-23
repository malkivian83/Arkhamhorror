// RR: Save an investigation that is resolving as if at another location; restore its physical position.
import { expect, it } from 'vitest'
import { newCampaign, startScenario } from '@lcg/cards'
import { applyInput, dispatch, type GameState } from '@lcg/engine'
import { choose, throughSetup } from '@lcg/engine/testing'
import { decodeSession, session } from './session'
import { markOf } from './undo'

it('preserves a pending remote investigation and restores the same physical location after loading', () => {
  const initial = throughSetup(
    startScenario(
      newCampaign('night-of-the-zealot', ['trish-original', 'dexter-original'], 'standard'),
      7,
      true,
    ),
  )
  const origin = initial.investigators[0]!.location!
  const remote = 'lot168-remote'
  const ready: GameState = {
    ...initial,
    pending: null,
    queue: [],
    interactive: true,
    chaosBag: ['elderSign'],
    investigators: initial.investigators.map((i) => ({ ...i, hand: [], discard: [] })),
    locations: {
      ...initial.locations,
      [origin]: { ...initial.locations[origin]!, revealed: true, clues: 3 },
      [remote]: {
        ...initial.locations[origin]!,
        id: remote,
        name: 'Remote room',
        revealed: true,
        clues: 3,
        shroud: 3,
      },
    },
  }
  let pending = dispatch(ready, {
    type: 'BeginSkillTest',
    investigator: '07003',
    skill: 'intellect',
    difficulty: 2,
    kind: { type: 'investigate', location: origin },
  })
  pending = choose(choose(pending, 'choice.revealToken'), 'choice.trishInvestigate', {
    location: pending.locations[remote]!.name,
  })
  expect(pending.asIfLocations).toHaveLength(1)
  const restored = decodeSession(
    JSON.stringify(session(pending, { base: pending, inputs: [], marks: [markOf(pending)] }, null)),
  ).state!
  expect(restored).toEqual(pending)
  const input = { investigator: pending.pending!.investigator, choice: 0 }
  const result = applyInput(restored, input)
  expect(result).toEqual(applyInput(pending, input))
  expect(result.investigators[0]!.location).toBe(origin)
  expect(result.asIfLocations).toBeUndefined()
})
