import { expect, it } from 'vitest'
import { reprintSource } from '../reprints'
import approvals from './approvals.json'
import permanent from '../data/permanent-talents.json'
import sequenced from '../data/sequenced-events.json'
import restricted from '../data/restricted-slots.json'
import starter from '../data/starter-actions.json'
import phase from '../data/phase-bonuses.json'
import d0 from '../data/ashcan-pete.json'
import d1 from '../data/asset-utilities.json'
import d2 from '../data/attached-upgrades.json'
import d3 from '../data/basic-abilities.json'
import d4 from '../data/basic-action-skills.json'
import d5 from '../data/basic-events.json'
import d6 from '../data/classic-equipment.json'
import d7 from '../data/classic-foundations.json'
import d8 from '../data/combat-tools.json'
import d9 from '../data/conditional-commit.json'
import d10 from '../data/context-skills.json'
import d11 from '../data/core-2026.json'
import d12 from '../data/direct-events.json'
import d13 from '../data/distributed-results.json'
import d14 from '../data/dunwich-followup.json'
import d15 from '../data/dunwich-pilot.json'
import d16 from '../data/dunwich-support.json'
import d17 from '../data/jenny-barnes.json'
import d18 from '../data/movement-skills.json'
import d19 from '../data/reactive-events.json'
import d20 from '../data/reactive-support.json'
import d21 from '../data/reprints-wave-1.json'
import d22 from '../data/reprints-wave-2.json'
import d23 from '../data/result-skills.json'
import d24 from '../data/search-assets.json'
import d25 from '../data/survivor-deck.json'
import d26 from '../data/test-modifiers.json'
import d27 from '../data/variable-icons.json'
it('adds twelve distinct codes and levels without previous families', () => {
  const previous = [
    ...permanent,
    ...sequenced,
    ...restricted,
    ...starter,
    ...phase,
    ...d0,
    ...d1,
    ...d2,
    ...d3,
    ...d4,
    ...d5,
    ...d6,
    ...d7,
    ...d8,
    ...d9,
    ...d10,
    ...d11,
    ...d12,
    ...d13,
    ...d14,
    ...d15,
    ...d16,
    ...d17,
    ...d18,
    ...d19,
    ...d20,
    ...d21,
    ...d22,
    ...d23,
    ...d24,
    ...d25,
    ...d26,
    ...d27,
  ]
  const codes = new Set(previous.map((c) => c.code))
  const families = new Set(previous.map((c) => reprintSource(c.code)))
  expect(new Set(approvals.cards.map((c) => reprintSource(c.code))).size).toBe(12)
  for (const c of approvals.cards) {
    expect(codes.has(c.code)).toBe(false)
    expect(families.has(reprintSource(c.code))).toBe(false)
  }
})
