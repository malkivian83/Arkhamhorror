import { playerCardDef } from '@lcg/engine'
import { expect, it } from 'vitest'
import '../index'
import { rebindCard, registerReviewedReprint } from './register'
import approvals from './approvals.json'
// RR: Card identity. Card-code adaptation preserves all entity identifiers.
it('rebinds hand choices and nested card messages without changing entity identifiers', () => {
  const original = {
    key: 'hand:12065',
    owner: '12065',
    investigator: 'hand:12065',
    target: { type: 'hand', code: '12065' },
    then: [
      { type: 'PlayCard', code: '12065', effect: [{ type: 'SealToken', code: '12065' }] },
      { type: 'DiscardAsset', asset: '12065' },
      { type: 'PlayCard', code: 'other' },
    ],
  }
  const copy = JSON.parse(JSON.stringify(original)),
    actual = rebindCard(original, '12065', '01065')
  expect(actual.key).toBe('hand:01065')
  expect(actual.target.code).toBe('01065')
  expect(actual.then[0]!.code).toBe('01065')
  expect(actual.then[0]!.effect?.[0]?.code).toBe('01065')
  expect(actual.owner).toBe('12065')
  expect(actual.investigator).toBe('hand:12065')
  expect(actual.then[1]!.asset).toBe('12065')
  expect(actual.then[2]!.code).toBe('other')
  expect(original).toEqual(copy)
})
it('rejects an unapproved or mismatched source', () => {
  expect(() => registerReviewedReprint('not-approved', '12065')).toThrow()
  expect(() => registerReviewedReprint('01020', '12065')).toThrow()
})
it.each(approvals.cards)(
  'preserves the reviewed mechanical fields for $code',
  ({ code, behaviorSource }) => {
    const actual = playerCardDef(code)!,
      source = playerCardDef(behaviorSource)!
    for (const field of [
      'name',
      'type',
      'class',
      'traits',
      'cost',
      'xp',
      'icons',
      'slots',
      'unique',
      'health',
      'sanity',
      'fast',
      'uses',
    ] as const)
      expect(actual[field] ?? (field === 'xp' ? 0 : undefined), code + ':' + field).toEqual(
        source[field] ?? (field === 'xp' ? 0 : undefined),
      )
  },
)
