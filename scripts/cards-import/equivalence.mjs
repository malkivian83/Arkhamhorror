import { createHash } from 'node:crypto'
// Mechanical text is compared in memory; only hashes are stored in this repository.
export const EQUIVALENCE_FIELDS = [
  'name',
  'type_code',
  'faction_code',
  'faction2_code',
  'faction3_code',
  'cost',
  'xp',
  'health',
  'sanity',
  'skill_willpower',
  'skill_intellect',
  'skill_combat',
  'skill_agility',
  'skill_wild',
  'is_unique',
  'is_permanent',
  'permanent',
  'health_per_investigator',
  'double_sided',
  'back_text',
  'exceptional',
  'myriad',
  'exile',
  'deck_limit',
  'slot',
  'traits',
  'text',
  'restrictions',
  'bonded_count',
  'bonded_to',
  'keywords',
]
export function equivalenceHash(card) {
  const fields = EQUIVALENCE_FIELDS.map((key) => [
    key,
    typeof card[key] === 'string' ? card[key].replace(/\s+/g, ' ').trim() : (card[key] ?? null),
  ])
  return createHash('sha256').update(JSON.stringify(fields)).digest('hex')
}
export function assertEquivalent(source, target) {
  const a = equivalenceHash(source),
    b = equivalenceHash(target)
  if (a !== b) throw new Error('Reprint differs from its reviewed source: ' + target.code)
  return a
}
