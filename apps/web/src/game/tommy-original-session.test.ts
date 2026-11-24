// RR: When an asset is defeated, recovery and its exact physical copy survive saving.
import { expect, it } from 'vitest'
import { newCampaign, startScenario } from '@lcg/cards'
import { applyInput, dispatch, type GameState } from '@lcg/engine'
import { throughSetup } from '@lcg/engine/testing'
import { decodeSession, session } from './session'
import { markOf } from './undo'
it('restores a pending when-defeated reaction before the asset is discarded', () => {
  const base = throughSetup(
    startScenario(newCampaign('night-of-the-zealot', ['tommy-original'], 'standard', 3), 3, true),
  )
  const ready: GameState = {
    ...base,
    assets: {},
    pending: null,
    queue: [],
    interactive: true,
    phase: 'investigation',
    activeTurn: '06001',
    investigators: base.investigators.map((i) => ({
      ...i,
      hand: [],
      deck: ['01088', '01087'],
      discard: [],
      resources: 5,
    })),
  }
  let s = dispatch(ready, { type: 'PutAssetIntoPlay', investigator: '06001', code: '01072' })
  const a = Object.values(s.assets)[0]!
  s = dispatch(
    { ...s, pending: null, queue: [] },
    { type: 'DamageAsset', asset: a.id, damage: 2, horror: 0 },
  )
  expect(s.assets[a.id]).toBeDefined()
  expect(s.pending!.question.choices[0]!.label).toBe('ability.tommyRecover')
  const loaded = decodeSession(
    JSON.stringify(session(s, { base: s, inputs: [], marks: [markOf(s)] }, null)),
  ).state!
  expect(loaded).toEqual(s)
  const input = { investigator: s.pending!.investigator, choice: 0 }
  const result = applyInput(loaded, input)
  expect(result).toEqual(applyInput(s, input))
  expect(result.investigators[0]!.resources).toBe(7)
  expect(result.investigators[0]!.deck).toContain('01072')
})
