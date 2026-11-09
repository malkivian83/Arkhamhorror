// Codes of this lot are new: no earlier batch, catalogue entry or reprint family repeats them.
import { expect, it } from 'vitest'
import { reprintSource } from '../reprints'
import approvals from './approvals.json'
import definitions from '../data/carolyn-fern.json'
import d0 from '../data/action-history.json'
import d1 from '../data/andre-patel.json'
import d2 from '../data/ashcan-pete.json'
import d3 from '../data/asset-utilities.json'
import d4 from '../data/attached-upgrades.json'
import d5 from '../data/attack-history.json'
import d6 from '../data/backup-events.json'
import d7 from '../data/basic-abilities.json'
import d8 from '../data/basic-action-skills.json'
import d9 from '../data/basic-events.json'
import d10 from '../data/chance-encounter.json'
import d11 from '../data/charged-assets.json'
import d12 from '../data/classic-equipment.json'
import d13 from '../data/classic-foundations.json'
import d14 from '../data/combat-support.json'
import d15 from '../data/combat-tools.json'
import d16 from '../data/conditional-assets.json'
import d17 from '../data/conditional-commit.json'
import d18 from '../data/context-skills.json'
import d19 from '../data/core-2026.json'
import d20 from '../data/damage-turn.json'
import d21 from '../data/deck-divination.json'
import d22 from '../data/direct-effects.json'
import d23 from '../data/direct-events.json'
import d24 from '../data/discard-reactions.json'
import d25 from '../data/distributed-results.json'
import d26 from '../data/dunwich-followup.json'
import d27 from '../data/dunwich-pilot.json'
import d28 from '../data/dunwich-support.json'
import d29 from '../data/enemy-relocation.json'
import d30 from '../data/event-economy.json'
import d31 from '../data/exclusive-skills.json'
import d32 from '../data/father-mateo.json'
import d33 from '../data/fortune-dilemmas.json'
import d34 from '../data/grouped-import.json'
import d35 from '../data/harvey-walters.json'
import d36 from '../data/immediate-action-events.json'
import d37 from '../data/immediate-action-skills.json'
import d38 from '../data/improvised-survival.json'
import d39 from '../data/jenny-barnes.json'
import d40 from '../data/lola-hayes.json'
import d41 from '../data/marie-lambeau.json'
import d42 from '../data/movement-skills.json'
import d43 from '../data/nathaniel-cho.json'
import d44 from '../data/next-test-effects.json'
import d45 from '../data/next-turn-benefits.json'
import d46 from '../data/permanent-talents.json'
import d47 from '../data/phase-bonuses.json'
import d48 from '../data/play-economy.json'
import d49 from '../data/protected-draw.json'
import d50 from '../data/protection-tools.json'
import d51 from '../data/quick-shot.json'
import d52 from '../data/reactive-events.json'
import d53 from '../data/reactive-support.json'
import d54 from '../data/reprints-wave-1.json'
import d55 from '../data/reprints-wave-2.json'
import d56 from '../data/resource-reactions.json'
import d57 from '../data/restricted-slots.json'
import d58 from '../data/result-skills.json'
import d59 from '../data/reused-mechanics.json'
import d60 from '../data/rex-murphy.json'
import d61 from '../data/round-effects.json'
import d62 from '../data/search-assets.json'
import d63 from '../data/secret-scrolls.json'
import d64 from '../data/sequenced-events.json'
import d65 from '../data/services-parley.json'
import d66 from '../data/simple-assets.json'
import d67 from '../data/skill-replacement.json'
import d68 from '../data/skill-tricks.json'
import d69 from '../data/skill-utilities.json'
import d70 from '../data/slot-search.json'
import d71 from '../data/spell-field-tools.json'
import d72 from '../data/starter-actions.json'
import d73 from '../data/stella-clark.json'
import d74 from '../data/stella-sideboard.json'
import d75 from '../data/support-allies.json'
import d76 from '../data/support-skills.json'
import d77 from '../data/survivor-deck.json'
import d78 from '../data/synergy-attacks.json'
import d79 from '../data/synergy.json'
import d80 from '../data/targeted-events.json'
import d81 from '../data/temporary-skills.json'
import d82 from '../data/test-modifiers.json'
import d83 from '../data/test-recovery.json'
import d84 from '../data/therapeutic-recovery.json'
import d85 from '../data/token-skills.json'
import d86 from '../data/tools-parley.json'
import d87 from '../data/upgraded-variants.json'
import d88 from '../data/variable-icons.json'
import d89 from '../data/warning-shot.json'
import d90 from '../data/wendy-adams.json'

const previous: { code: string }[] = [
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
  ...d28,
  ...d29,
  ...d30,
  ...d31,
  ...d32,
  ...d33,
  ...d34,
  ...d35,
  ...d36,
  ...d37,
  ...d38,
  ...d39,
  ...d40,
  ...d41,
  ...d42,
  ...d43,
  ...d44,
  ...d45,
  ...d46,
  ...d47,
  ...d48,
  ...d49,
  ...d50,
  ...d51,
  ...d52,
  ...d53,
  ...d54,
  ...d55,
  ...d56,
  ...d57,
  ...d58,
  ...d59,
  ...d60,
  ...d61,
  ...d62,
  ...d63,
  ...d64,
  ...d65,
  ...d66,
  ...d67,
  ...d68,
  ...d69,
  ...d70,
  ...d71,
  ...d72,
  ...d73,
  ...d74,
  ...d75,
  ...d76,
  ...d77,
  ...d78,
  ...d79,
  ...d80,
  ...d81,
  ...d82,
  ...d83,
  ...d84,
  ...d85,
  ...d86,
  ...d87,
  ...d88,
  ...d89,
  ...d90,
]

it('adds seven distinct codes and levels absent from every other batch', () => {
  const codes = new Set(previous.map((c) => c.code))
  const families = new Set(previous.map((c) => reprintSource(c.code)))
  const own = approvals.cards.map((c) => c.code)
  expect(new Set(own).size).toBe(own.length)
  expect(definitions.map((d) => d.code)).toEqual(own)
  expect(new Set(own.map(reprintSource)).size).toBe(own.length)
  for (const code of own) {
    expect(codes.has(code), code).toBe(false)
    expect(families.has(reprintSource(code)), code).toBe(false)
  }
})
