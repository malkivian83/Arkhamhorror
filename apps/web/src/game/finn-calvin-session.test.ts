// RR: Save a partially assigned batch without losing its direct-only recipients or pending trauma.
import { expect, it } from 'vitest'
import { newCampaign, startScenario } from '@lcg/cards'
import { applyInput, dispatch, type GameState } from '@lcg/engine'
import { throughSetup, choose } from '@lcg/engine/testing'
import { decodeSession, session } from './session'
import { markOf } from './undo'

it('round-trips Calvin direct assignment and Finn search through saved sessions', () => {
  const initial = throughSetup(
    startScenario(newCampaign('night-of-the-zealot', ['calvin', 'finn'], 'standard'), 7, true),
  )
  let ready: GameState = {
    ...initial,
    pending: null,
    queue: [],
    investigators: initial.investigators.map((i) => ({
      ...i,
      hand: i.id === '04003' ? ['04010'] : [],
      damage: 0,
      horror: 0,
    })),
  }
  ready = dispatch(ready, { type: 'PutAssetIntoPlay', investigator: '04005', code: '04015' })
  const assigning = dispatch(ready, {
    type: 'TakeDamage',
    investigator: '04005',
    damage: 1,
    horror: 1,
    direct: true,
  })
  const search = dispatch(
    { ...ready, activeTurn: '04003' },
    { type: 'PlayCard', investigator: '04003', code: '04010', byEffect: true },
  )
  for (const pending of [assigning, search]) {
    expect(pending.pending).not.toBeNull()
    const restored = decodeSession(
      JSON.stringify(
        session(pending, { base: pending, inputs: [], marks: [markOf(pending)] }, null),
      ),
    ).state!
    expect(restored).toEqual(pending)
    const input = { investigator: pending.pending!.investigator, choice: 0 }
    expect(applyInput(restored, input)).toEqual(applyInput(pending, input))
  }
  let finished = choose(assigning, 'choice.assignToAsset')
  finished = choose(finished, 'choice.assignToAsset')
  expect(finished.investigators[0]).toMatchObject({ damage: 0, horror: 0 })
})
