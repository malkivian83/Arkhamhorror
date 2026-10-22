// RR: Equipment Slots (restricted slots), Damage.
import { dispatch } from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'

const ready = (s: ReturnType<typeof game>) => ({ ...s, pending: null, queue: [] })
const put = (s: ReturnType<typeof game>, code: string) =>
  dispatch(ready(patch({ hand: [code] })(s)), {
    type: 'PutAssetIntoPlay',
    investigator: 'a',
    code,
    fromHand: true,
  })
const owned = (s: ReturnType<typeof game>) =>
  Object.values(s.assets)
    .filter((a) => a.owner === 'a')
    .map((a) => a.code)
    .sort()

it('holds a weapon beside two other hand assets, including a two-handed weapon', () => {
  let s = withAsset(withAsset(game(), '02147'), '01087')
  s = put(s, '02010')
  expect(s.pending).toBeNull()
  expect(owned(s)).toEqual(['01087', '02010', '02147'])
  s = put(
    withAsset(withAsset(withAsset(game(), '02147'), '01087'), '01087', { id: 'second' }),
    '01086',
  )
  expect(s.pending).toBeNull()
})

it('cannot hold a non-Weapon asset and offers only discards that make room', () => {
  let s = withAsset(withAsset(game(), '02147'), '01086')
  s = withAsset(withAsset(s, '01087'), '01087', { id: 'second' })
  s = put(s, '01087')
  expect(s.pending!.question.prompt).toBe('prompt.freeSlot')
  // Discarding the Knife would leave three non-Weapon assets for two regular slots.
  expect(s.pending!.question.choices.map((c) => c.params?.card)).toEqual([
    'Flashlight',
    'Flashlight',
  ])
  s = choose(s, 'choice.discard', { card: 'Flashlight' })
  expect(owned(s)).toEqual(['01086', '01087', '01087', '02147'])
})

it('when discarded, makes its owner discard weapons that no longer fit', () => {
  let s = withAsset(withAsset(game(), '02147'), '01087')
  s = put(s, '02010')
  s = dispatch(ready(s), { type: 'DiscardAsset', asset: '02147' })
  expect(s.pending!.question.prompt).toBe('prompt.freeSlot')
  s = choose(s, 'choice.discard', { card: 'Flashlight' })
  expect(owned(s)).toEqual(['02010'])
  expect(me(s).discard).toEqual(expect.arrayContaining(['02147', '01087']))
})
