import {
  allPlayerCardDefs,
  applyInput,
  dispatch,
  playerCardBehavior,
  playerCardDef,
  type GameState,
} from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, patch, withAsset } from '../dunwich-pilot/testing'
import './index'
// RR: Uses, Control, At Your Location. Allocate at most four total units.
const supply = allPlayerCardDefs().find((d) =>
  ['supply', 'supplies'].includes(d.uses?.type ?? ''),
)!.code
const open = () => {
  let s = withAsset(game(['a', 'b', 'c']), supply, { id: 'own', uses: 0 })
  s = withAsset(s, supply, { id: 'near', owner: 'b', uses: 0 })
  s = withAsset(patch({ location: 'B' }, 'c')(s), supply, { id: 'remote', owner: 'c', uses: 0 })
  return during(s, patch({ hand: ['03239'], resources: 0 }))
}
it('mixes supplies across nearby controllers and takes the remaining resources', () => {
  expect(['supply', 'supplies']).toContain(playerCardDef(supply)!.uses!.type)
  let s = choose(open(), 'action.play', { card: 'Emergency Cache' })
  const choices = s.pending!.question.choices
  expect(choices.some((c) => c.target?.type === 'asset' && c.target.id === 'remote')).toBe(false)
  s = choose(s, 'choice.resultUses')
  s = JSON.parse(JSON.stringify(s)) as GameState
  s = applyInput(s, {
    investigator: 'a',
    choice: s.pending!.question.choices.findIndex(
      (c) => c.target?.type === 'asset' && c.target.id === 'near',
    ),
  })
  s = choose(s, 'choice.eventResources', { n: 2 })
  expect(s.assets.own!.uses).toBe(1)
  expect(s.assets.near!.uses).toBe(1)
  expect(s.investigators[0]!.resources).toBe(2)
  expect(s.investigators[1]!.resources).toBe(5)
})
it('places exactly four supplies and rechecks locality between choices', () => {
  let s = choose(open(), 'action.play', { card: 'Emergency Cache' })
  for (let n = 0; n < 4; n++) s = choose(s, 'choice.resultUses')
  expect(s.assets.own!.uses).toBe(4)
  expect(s.pending?.question.choices.some((c) => c.label === 'choice.resultUses')).toBeFalsy()
  const before = open()
  const moved = patch({ location: 'B' })(before)
  const next = dispatch(
    { ...moved, pending: null, queue: [] },
    {
      type: 'PlayerCardEffect',
      code: '03239',
      investigator: 'a',
      step: 'allocate',
      data: { remaining: 2 },
    },
  )
  expect(
    next
      .pending!.question.choices.filter((c) => c.label === 'choice.resultUses')
      .map((c) => (c.target && 'id' in c.target ? c.target.id : '')),
  ).toEqual(['own', 'remote'])
})
it('takes four resources directly with no eligible assets and ignores an exhausted budget', () => {
  const s = choose(during(game(), patch({ hand: ['03239'], resources: 0 })), 'action.play', {
    card: 'Emergency Cache',
  })
  expect(s.investigators[0]!.resources).toBe(4)
  expect(playerCardBehavior('03239')!.effect!(s, 'a', 'allocate', { remaining: 0 })).toEqual([])
})
