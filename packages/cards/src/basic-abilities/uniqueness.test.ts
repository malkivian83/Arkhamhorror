import { describe, expect, it } from 'vitest'
import { reprintSource } from '../reprints'
import approvals from './approvals.json'
import pete from '../data/ashcan-pete.json'
import attached from '../data/attached-upgrades.json'
import basic from '../data/basic-action-skills.json'
import equipment from '../data/classic-equipment.json'
import foundations from '../data/classic-foundations.json'
import combat from '../data/combat-tools.json'
import conditional from '../data/conditional-commit.json'
import context from '../data/context-skills.json'
import core from '../data/core-2026.json'
import direct from '../data/direct-events.json'
import distributed from '../data/distributed-results.json'
import followup from '../data/dunwich-followup.json'
import pilot from '../data/dunwich-pilot.json'
import support from '../data/dunwich-support.json'
import movement from '../data/movement-skills.json'
import reactions from '../data/reactive-events.json'
import reactive from '../data/reactive-support.json'
import firstReprints from '../data/reprints-wave-1.json'
import secondReprints from '../data/reprints-wave-2.json'
import result from '../data/result-skills.json'
import search from '../data/search-assets.json'
import survivor from '../data/survivor-deck.json'
import modifiers from '../data/test-modifiers.json'
import variable from '../data/variable-icons.json'

describe('basic ability assets, new families and reviewed reprints', () => {
  it('introduces codes and families absent from every other batch', () => {
    const previous: { code: string }[] = [
      ...pete,
      ...attached,
      ...basic,
      ...equipment,
      ...foundations,
      ...combat,
      ...conditional,
      ...context,
      ...core,
      ...direct,
      ...distributed,
      ...followup,
      ...pilot,
      ...support,
      ...movement,
      ...reactions,
      ...reactive,
      ...firstReprints,
      ...secondReprints,
      ...result,
      ...search,
      ...survivor,
      ...modifiers,
      ...variable,
    ]
    const codes = new Set(previous.map((c) => c.code)),
      families = new Set(previous.map((c) => reprintSource(c.code)))
    expect(new Set(approvals.cards.map((c) => c.code)).size).toBe(approvals.cards.length)
    for (const card of approvals.cards) {
      expect(codes.has(card.code), card.code).toBe(false)
      expect(families.has(reprintSource(card.code)), card.code).toBe(false)
    }
  })
  it('counts 47 codes, 40 distinct cards or levels and 7 reprints', () => {
    const sources = approvals.cards.map((c) => reprintSource(c.code))
    expect(approvals.cards).toHaveLength(47)
    expect(new Set(sources).size).toBe(40)
    expect(approvals.cards.filter((c) => reprintSource(c.code) !== c.code)).toHaveLength(7)
    // Reprints share the family, module and tests of their original.
    for (const card of approvals.cards) {
      const original = approvals.cards.find((c) => c.code === reprintSource(card.code))!
      expect(card.family, card.code).toBe(original.family)
      expect(card.module, card.code).toBe(original.module)
    }
  })
})
