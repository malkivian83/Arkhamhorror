import { expect, it } from 'vitest'
import { allPlayerCardDefs } from '@lcg/engine'
import './testing'
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
import d10 from '../data/classic-equipment.json'
import d11 from '../data/classic-foundations.json'
import d12 from '../data/combat-tools.json'
import d13 from '../data/conditional-commit.json'
import d14 from '../data/context-skills.json'
import d15 from '../data/core-2026.json'
import d16 from '../data/direct-effects.json'
import d17 from '../data/direct-events.json'
import d18 from '../data/distributed-results.json'
import d19 from '../data/dunwich-followup.json'
import d20 from '../data/dunwich-pilot.json'
import d21 from '../data/dunwich-support.json'
import d22 from '../data/exclusive-skills.json'
import d23 from '../data/father-mateo.json'
import d24 from '../data/grouped-import.json'
import d25 from '../data/harvey-walters.json'
import d26 from '../data/immediate-action-events.json'
import d27 from '../data/immediate-action-skills.json'
import d28 from '../data/jenny-barnes.json'
import d29 from '../data/lola-hayes.json'
import d30 from '../data/marie-lambeau.json'
import d31 from '../data/movement-skills.json'
import d32 from '../data/nathaniel-cho.json'
import d33 from '../data/next-test-effects.json'
import d34 from '../data/permanent-talents.json'
import d35 from '../data/phase-bonuses.json'
import d36 from '../data/protected-draw.json'
import d37 from '../data/reactive-events.json'
import d38 from '../data/reactive-support.json'
import d39 from '../data/reprints-wave-1.json'
import d40 from '../data/reprints-wave-2.json'
import d41 from '../data/restricted-slots.json'
import d42 from '../data/result-skills.json'
import d43 from '../data/rex-murphy.json'
import d44 from '../data/round-effects.json'
import d45 from '../data/search-assets.json'
import d46 from '../data/sequenced-events.json'
import d47 from '../data/simple-assets.json'
import d48 from '../data/skill-replacement.json'
import d49 from '../data/skill-tricks.json'
import d50 from '../data/skill-utilities.json'
import d51 from '../data/starter-actions.json'
import d52 from '../data/stella-clark.json'
import d53 from '../data/stella-sideboard.json'
import d54 from '../data/support-allies.json'
import d55 from '../data/survivor-deck.json'
import d56 from '../data/synergy-attacks.json'
import d57 from '../data/synergy.json'
import d58 from '../data/targeted-events.json'
import d59 from '../data/test-modifiers.json'
import d60 from '../data/variable-icons.json'
import d61 from '../data/wendy-adams.json'
const definitions: { code: string }[] = [
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
]
it.each(['02002', '02008', '02009', '01031'])('%s is unique across batches and runtime', (code) => {
  expect(definitions.filter((c) => c.code === code)).toHaveLength(1)
  expect(allPlayerCardDefs().filter((c) => c.code === code)).toHaveLength(1)
})
