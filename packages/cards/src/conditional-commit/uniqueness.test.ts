import { describe, expect, it } from 'vitest'
import { reprintSource } from '../reprints'
import approvals from './approvals.json'
import core from '../data/core-2026.json'
import pilot from '../data/dunwich-pilot.json'
import followup from '../data/dunwich-followup.json'
import support from '../data/dunwich-support.json'
import firstReprints from '../data/reprints-wave-1.json'
import secondReprints from '../data/reprints-wave-2.json'
import foundations from '../data/classic-foundations.json'
import equipment from '../data/classic-equipment.json'
import reactive from '../data/reactive-support.json'
import combat from '../data/combat-tools.json'
describe('conditional skills, not additional printings', () => {
  it('introduces distinct families absent from every earlier batch and the core set', () => {
    const previous = [
      ...core,
      ...pilot,
      ...followup,
      ...support,
      ...firstReprints,
      ...secondReprints,
      ...foundations,
      ...equipment,
      ...reactive,
      ...combat,
    ]
    const codes = new Set(previous.map((c) => c.code)),
      families = new Set(previous.map((c) => reprintSource(c.code)))
    expect(new Set(approvals.cards.map((c) => c.code)).size).toBe(approvals.cards.length)
    expect(new Set(approvals.cards.map((c) => reprintSource(c.code))).size).toBe(
      approvals.cards.length,
    )
    for (const card of approvals.cards) {
      expect(codes.has(card.code)).toBe(false)
      expect(families.has(reprintSource(card.code))).toBe(false)
    }
  })
})
