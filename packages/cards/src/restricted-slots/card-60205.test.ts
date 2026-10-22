// RR: Equipment Slots (restricted slots), Hand Size.
import { choose, during, labels } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { me, patch } from '../dunwich-pilot/testing'
import { game, holding, owned, put, withAsset } from './testing'

it('holds one Tome in an extra hand slot, but no other hand asset', () => {
  let s = put(holding('60205', '01087', '01087'), '01035')
  expect(s.pending).toBeNull()
  expect(owned(s)).toEqual(['01035', '01087', '01087', '60205'])
  s = put(holding('60205', '01087', '01087'), '01086')
  expect(s.pending!.question.prompt).toBe('prompt.freeSlot')
  s = put(holding('60205', '01087', '01087', '01035'), '01042')
  expect(s.pending!.question.prompt).toBe('prompt.freeSlot')
})

it('raises the maximum hand size by one only while it is controlled', () => {
  const cards = Array.from({ length: 9 }, (_, n) => `filler-${n}`)
  let s = during(game(), (s) => withAsset(patch({ hand: cards })(s), '60205'), {
    type: 'CheckHandSize',
    investigator: 'a',
  })
  expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
  s = during(
    s,
    (s) => s,
    { type: 'DiscardAsset', asset: '60205' },
    { type: 'CheckHandSize', investigator: 'a' },
  )
  expect(labels(s)).toContain('choice.discard')
  expect(me(choose(s, 'choice.discard')).hand).toHaveLength(8)
})
