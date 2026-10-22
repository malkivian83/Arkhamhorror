// RR: Equipment Slots (restricted slots), Fast.
import { playerCardDef } from '@lcg/engine'
import { expect, it } from 'vitest'
import { holding, owned, put } from './testing'

it('is fast and holds one Spell or Ritual in an extra arcane slot', () => {
  expect(playerCardDef('05112')!.fast).toBe(true)
  // Two Shrivellings (Spell) fill the regular slots; Arcane Enlightenment (Ritual) uses the extra one.
  let s = put(holding('05112', '01060', '01060'), '60205')
  expect(s.pending).toBeNull()
  expect(owned(s)).toEqual(['01060', '01060', '05112', '60205'])
  s = put(holding('05112', '01060', '60205'), '01060')
  expect(s.pending).toBeNull()
  s = put(holding('05112', '01060', '01060', '60205'), '01060')
  expect(s.pending!.question.prompt).toBe('prompt.freeSlot')
})

it('does not hold an arcane asset without those traits', () => {
  // Enchanted Blade and The Necronomicon fill the regular slots and cannot move to the extra one.
  expect(put(holding('05112', '05193', '12012'), '01060').pending).toBeNull()
  const s = put(holding('05112', '05193', '12012'), '12012')
  expect(s.pending!.question.prompt).toBe('prompt.freeSlot')
})
