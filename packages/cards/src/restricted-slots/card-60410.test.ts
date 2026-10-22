// RR: Equipment Slots (restricted slots).
import { expect, it } from 'vitest'
import { holding, owned, put } from './testing'

it('is an ally that holds one Spell, but not a Ritual, in an extra arcane slot', () => {
  // Two Arcane Enlightenments (Ritual) fill the regular slots and cannot use the extra one.
  let s = put(holding('60410', '60205', '60205'), '60407')
  expect(s.pending).toBeNull()
  expect(owned(s)).toEqual(['60205', '60205', '60407', '60410'])
  s = put(holding('60410', '60205', '60205'), '60205')
  expect(s.pending!.question.prompt).toBe('prompt.freeSlot')
})
