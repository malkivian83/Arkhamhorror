// RR: Enemy attacks, original opportunity provoker and pending after-attack reactions survive saves.
import { expect, it } from 'vitest'
import { newCampaign, startScenario } from '@lcg/cards'
import { applyInput, dispatch, type GameState } from '@lcg/engine'
import { ghoul, spawnAt, throughSetup } from '@lcg/engine/testing'
import { decodeSession, session } from './session'
import { markOf } from './undo'
it('restores a redirected opportunity attack and Daniela’s response without changing the provoker or history', () => {
  const initial = throughSetup(
    startScenario(
      newCampaign('night-of-the-zealot', ['daniela-original', 'monterey'], 'standard'),
      7,
      true,
    ),
  )
  const origin = initial.investigators[0]!.location ?? Object.keys(initial.locations)[0]!
  const ready: GameState = {
    ...initial,
    pending: null,
    queue: [],
    interactive: true,
    enemies: {},
    phase: 'investigation',
    investigators: initial.investigators.map((i) => ({
      ...i,
      location: origin,
      hand: [],
      discard: [],
      damage: 0,
      horror: 0,
    })),
  }
  const location = ready.investigators[0]!.location!
  let s = dispatch(ready, spawnAt(location, { ...ghoul, health: 8 }, '08007'))
  s = dispatch(
    { ...s, pending: null, queue: [] },
    { type: 'InterceptAttacksThisPhase', investigator: '08001', code: '08021' },
  )
  const e = Object.values(s.enemies)[0]!
  s = dispatch(
    { ...s, pending: null, queue: [] },
    {
      type: 'EnemyAttack',
      enemy: e.id,
      investigator: '08007',
      opportunity: true,
      exhaustAfter: false,
    },
  )
  expect(s.pending!.question.choices.some((c) => c.label === 'ability.danielaRespond')).toBe(true)
  expect(s.investigators.find((i) => i.id === '08001')!.enemiesAttackedSinceTurnEnd).toContain(e.id)
  const loaded = decodeSession(
    JSON.stringify(session(s, { base: s, inputs: [], marks: [markOf(s)] }, null)),
  ).state!
  expect(loaded).toEqual(s)
  const input = { investigator: s.pending!.investigator, choice: 0 }
  expect(applyInput(loaded, input)).toEqual(applyInput(s, input))
})
