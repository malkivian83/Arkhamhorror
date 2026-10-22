// RR: Equipment Slots (restricted slots), Constant abilities.
import { choose } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { discard, holding, modifier, owned, put } from './testing'

it('adds two Weapon-only hand slots beside the regular ones', () => {
  // Flashlight x2 fill the regular hands; a two-handed Shotgun uses both Bandolier slots.
  let s = put(holding('51001', '01087', '01087'), '01029')
  expect(s.pending).toBeNull()
  expect(owned(s)).toEqual(['01029', '01087', '01087', '51001'])
  s = put(holding('51001', '01087', '01087', '01086'), '01087')
  expect(s.pending!.question.prompt).toBe('prompt.freeSlot')
})

it('gives +1 willpower only while Weapons fill two or more hand slots', () => {
  expect(modifier(holding('51001', '01086'), '51001-0', 'willpower')).toBe(0)
  expect(modifier(holding('51001', '01086', '01086'), '51001-0', 'willpower')).toBe(1)
  expect(modifier(holding('51001', '01029'), '51001-0', 'willpower')).toBe(1)
  expect(modifier(holding('51001', '01029'), '51001-0', 'combat')).toBe(0)
  expect(modifier(holding('51001', '01087', '01087', '01086'), '51001-0', 'willpower')).toBe(0)
})

it('when discarded, makes its owner discard what no longer fits', () => {
  let s = discard(holding('51001', '01087', '01087', '01029'), '51001-0')
  expect(s.pending!.question.prompt).toBe('prompt.freeSlot')
  s = choose(s, 'choice.discard', { card: 'Shotgun' })
  expect(owned(s)).toEqual(['01087', '01087'])
})
