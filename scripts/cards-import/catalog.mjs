import { sha256 } from './snapshots.mjs'

export const SCHEMA_VERSION = 1
export const IMPORTER_VERSION = 1
const CODE = /^\d{5}[a-z]{0,2}$/
const PLAYER_TYPES = new Set(['investigator', 'asset', 'event', 'skill', 'treachery', 'enemy'])
const CLASSES = new Set(['guardian', 'seeker', 'rogue', 'mystic', 'survivor', 'neutral'])
const SLOTS = {
  Hand: 'hand',
  Arcane: 'arcane',
  Accessory: 'accessory',
  Body: 'body',
  Ally: 'ally',
  Head: 'head',
}
const NUMBERS = [
  'cost',
  'xp',
  'health',
  'sanity',
  'skill_willpower',
  'skill_intellect',
  'skill_combat',
  'skill_agility',
  'skill_wild',
  'enemy_fight',
  'enemy_evade',
  'enemy_damage',
  'enemy_horror',
  'shroud',
  'clues',
  'victory',
]
const FLAGS = [
  'is_unique',
  'permanent',
  'exceptional',
  'myriad',
  'exile',
  'hidden',
  'double_sided',
  'health_per_investigator',
]
const sort = (values) => [...new Set(values)].sort()
const split = (value) =>
  (value ?? '')
    .split('.')
    .map((part) => part.trim())
    .filter(Boolean)
const present = (value) => typeof value === 'string' && value.trim().length > 0

export function stableJson(value) {
  const ordered = (item) => {
    if (Array.isArray(item)) return item.map(ordered)
    if (item !== null && typeof item === 'object')
      return Object.fromEntries(
        Object.keys(item)
          .sort()
          .map((key) => [key, ordered(item[key])]),
      )
    return item
  }
  return JSON.stringify(ordered(value), null, 2) + '\n'
}

export function numberValue(value) {
  if (value === undefined) return { kind: 'absent' }
  if (value === null) return { kind: 'dash' }
  if (Number.isInteger(value) && value >= 0) return { kind: 'number', value }
  const symbols = { '-2': 'X', '-3': '*', '-4': '?' }
  if (typeof value === 'number' && symbols[value]) return { kind: 'symbol', value: symbols[value] }
  throw new Error(`Invalid mechanical number: ${value}`)
}

export function parseSlots(value) {
  const slots = [],
    unknown = []
  for (const part of split(value)) {
    const match = /^(.*?)(?: x(\d+))?$/.exec(part)
    const name = SLOTS[match[1]],
      count = Number(match[2] ?? 1)
    if (!name || count < 1 || count > 4) unknown.push(part)
    else slots.push(...Array(count).fill(name))
  }
  return { slots, unknown }
}

export function indexCards(rows, label) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error(`Empty catalog: ${label}`)
  const index = new Map()
  for (const row of rows) {
    if (
      !row ||
      typeof row.code !== 'string' ||
      !CODE.test(row.code) ||
      !present(row.type_code) ||
      !present(row.pack_code) ||
      !present(row.real_name ?? row.name)
    )
      throw new Error(`Invalid card identity in ${label}: ${row?.code}`)
    if (index.has(row.code)) throw new Error(`Duplicate card code in ${label}: ${row.code}`)
    index.set(row.code, row)
  }
  return index
}

function signatureGroups(requirements) {
  return Object.entries(requirements?.card ?? {})
    .map(([primary, alternatives]) => ({
      primary,
      alternatives: sort(
        typeof alternatives === 'object' && alternatives !== null
          ? Object.values(alternatives)
          : [primary],
      ),
    }))
    .sort((a, b) => a.primary.localeCompare(b.primary))
}

function deckbuilding(card) {
  const requirements = card.deck_requirements
  if (card.type_code !== 'investigator') return undefined
  const options = card.deck_options ?? []
  const simple =
    options.length > 0 &&
    options.every(
      (option) =>
        Object.keys(option).every((key) => ['faction', 'level'].includes(key)) &&
        Array.isArray(option.faction) &&
        option.faction.every((faction) => CLASSES.has(faction)) &&
        option.level?.min === 0 &&
        Number.isInteger(option.level?.max) &&
        option.level.max >= 0,
    )
  return {
    size: requirements?.size ?? null,
    signatureGroups: signatureGroups(requirements),
    randomRequirements: requirements?.random ?? [],
    optionKeys: sort(options.flatMap(Object.keys)),
    // Complex source rules stay in the external snapshot; do not strip them into valid-looking rules.
    simpleOptions: simple
      ? options.map((option) => ({ classes: option.faction, maxLevel: option.level.max }))
      : null,
    requiresCustomRules: !simple || !Number.isInteger(requirements?.size),
  }
}

function translationCoverage(english, spanish) {
  const field = (key, realKey) => ({
    present: present(spanish?.[key]),
    differsFromEnglish:
      present(spanish?.[key]) && spanish[key] !== (english[realKey] ?? english[key]),
  })
  return {
    recordPresent: Boolean(spanish),
    name: field('name', 'real_name'),
    text: field('text', 'real_text'),
    backText: { ...field('back_text', 'back_text'), required: present(english.back_text) },
    imageAdvertised: present(spanish?.imagesrc),
    backImageAdvertised: present(spanish?.backimagesrc),
  }
}

function normalize(card, spanish, local, referenceCodes) {
  const issues = [],
    numbers = {}
  for (const key of NUMBERS) {
    if (key !== 'cost' && card[key] === undefined) continue
    try {
      numbers[key] = numberValue(card[key])
    } catch {
      issues.push(`invalid-number:${key}`)
    }
  }
  const factions = [card.faction_code, card.faction2_code, card.faction3_code].filter(Boolean)
  const slots = parseSlots(card.real_slot)
  const building = deckbuilding(card)
  if (!PLAYER_TYPES.has(card.type_code)) issues.push('unsupported-card-type')
  if (factions.length !== 1 || factions.some((value) => !CLASSES.has(value)))
    issues.push('unsupported-factions')
  if (slots.unknown.length) issues.push('unsupported-slots')
  if (Object.values(numbers).some((n) => n.kind === 'symbol')) issues.push('symbolic-number')
  if (card.cost === null) issues.push('dash-cost')
  if (building?.requiresCustomRules) issues.push('complex-deckbuilding')
  if (building?.signatureGroups.some((group) => group.alternatives.length !== 1))
    issues.push('alternative-signatures')
  if (!/^\d{5}$/.test(card.code)) issues.push('extended-code-presentation')
  if (card.customization_options || card.customization_text) issues.push('customization')
  if (card.bonded_to || card.bonded_cards?.length) issues.push('bonded')
  const owners = sort(Object.keys(card.restrictions?.investigator ?? {}))
  const linked = card.linked_to_code ?? card.linked_card?.code
  const relations = {
    ...(card.duplicate_of_code ? { duplicateOf: card.duplicate_of_code } : {}),
    ...(card.alternate_of_code ? { alternateOf: card.alternate_of_code } : {}),
    ...(linked ? { otherSide: linked } : {}),
    duplicatedBy: sort(card.duplicated_by ?? []),
    alternatedBy: sort(card.alternated_by ?? []),
    bondedCards: (card.bonded_cards ?? []).map(({ code, count }) => ({ code, count })),
    signatureOf: owners,
  }
  const review = ['behavior-review']
  if (card.permanent || card.exceptional || card.myriad || card.exile) review.push('keyword-rules')
  if (
    card.duplicate_of_code ||
    card.alternate_of_code ||
    relations.duplicatedBy.length ||
    relations.alternatedBy.length
  )
    review.push('edition-rules')
  if (card.type_code === 'investigator') review.push('investigator-setup')
  if (card.linked_card || card.linked_to_code) review.push('linked-faces')
  const classification = !PLAYER_TYPES.has(card.type_code)
    ? 'dependency'
    : card.subtype_code === 'basicweakness'
      ? 'basic-weakness'
      : card.subtype_code === 'weakness'
        ? 'weakness'
        : owners.length
          ? 'signature'
          : card.bonded_to
            ? 'bonded'
            : card.type_code === 'investigator'
              ? 'investigator'
              : card.xp === undefined
                ? 'restricted-review'
                : 'standard-candidate'
  if (classification === 'restricted-review') review.push('pool-eligibility')
  if (card.restrictions && Object.keys(card.restrictions).some((key) => key !== 'investigator'))
    review.push('source-restrictions')
  return {
    code: card.code,
    pack: card.pack_code,
    position: card.position,
    name: card.real_name ?? card.name,
    type: card.type_code,
    ...(card.subtype_code ? { subtype: card.subtype_code } : {}),
    factions,
    traits: split(card.real_traits),
    numbers,
    slots,
    flags: Object.fromEntries(FLAGS.filter((key) => card[key] === true).map((key) => [key, true])),
    ...(card.deck_limit !== undefined ? { deckLimit: card.deck_limit } : {}),
    classification,
    relations,
    ...(building ? { deckbuilding: building } : {}),
    translations: { es: translationCoverage(card, spanish) },
    englishImageAdvertised: present(card.imagesrc),
    localDefinition: local.has(card.code),
    localBehaviorRegistered: local.get(card.code)?.behaviorRegistered ?? false,
    referenceJsonPresent: referenceCodes.has(card.code),
    modelIssues: sort(issues),
    requiredReview: sort(review),
    activation: 'not-reviewed',
  }
}

/** Limited regression projection of the existing core importer, never an activation path. */
export function projectCore(card) {
  const base = {
    code: card.code,
    position: card.position,
    name: card.name,
    ...(card.subname ? { subname: card.subname } : {}),
    type: card.type_code,
    class: card.faction_code,
    traits: split(card.real_traits),
    ...(card.is_unique ? { unique: true } : {}),
    ...(card.subtype_code ? { weakness: card.subtype_code } : {}),
  }
  if (card.type_code === 'investigator') {
    const modifier = (card.real_text ?? '').match(/\[elder_sign\] effect: ([+-]\d+)/)
    return {
      ...base,
      skills: Object.fromEntries(
        ['willpower', 'intellect', 'combat', 'agility'].map((key) => [key, card[`skill_${key}`]]),
      ),
      health: card.health,
      sanity: card.sanity,
      ...(modifier ? { elderSignModifier: Number(modifier[1]) } : {}),
    }
  }
  const { slots, unknown } = parseSlots(card.real_slot)
  if (unknown.length) throw new Error(`Unsupported core slots: ${card.code}`)
  const text = card.real_text ?? '',
    uses = text.match(/Uses \((\d+) ([a-z]+)\)/i)
  return {
    ...base,
    ...(card.cost !== undefined && card.cost !== null ? { cost: card.cost } : {}),
    xp: card.xp ?? 0,
    icons: Object.fromEntries(
      ['willpower', 'intellect', 'combat', 'agility', 'wild']
        .filter((key) => card[`skill_${key}`])
        .map((key) => [key, card[`skill_${key}`]]),
    ),
    slots,
    ...(card.health ? { health: card.health } : {}),
    ...(card.sanity ? { sanity: card.sanity } : {}),
    ...(/^Fast\./m.test(text) ? { fast: true } : {}),
    ...(uses ? { uses: { count: Number(uses[1]), type: uses[2].toLowerCase() } } : {}),
    ...(/Max 1 committed per skill test/i.test(text) ? { commitLimit: 1 } : {}),
  }
}

function diffCore(english, baseline) {
  const existing = new Map(baseline.map((card) => [card.code, card]))
  const incoming = [...english.values()].filter((card) => card.pack_code === 'core_2026')
  const changed = [],
    added = []
  for (const card of incoming) {
    const candidate = projectCore(card),
      old = existing.get(card.code)
    if (!old) {
      added.push(card.code)
      continue
    }
    for (const key of sort([...Object.keys(old), ...Object.keys(candidate)]))
      if (stableJson(old[key] ?? null) !== stableJson(candidate[key] ?? null))
        changed.push({
          code: card.code,
          field: key,
          before: old[key] ?? null,
          after: candidate[key] ?? null,
          reason:
            key === 'elderSignModifier' && candidate[key] === undefined
              ? 'Non-numeric elder sign is not zero; keep behavior-specific resolution'
              : 'Source differs from current core data',
        })
  }
  const incomingCodes = new Set(incoming.map((card) => card.code))
  return {
    count: incoming.length,
    added: added.sort(),
    missing: [...existing.keys()].filter((code) => !incomingCodes.has(code)).sort(),
    changed,
  }
}

export function buildCatalog({ en, es, packs, baseline, runtime = [], reference = [] }) {
  if (!Array.isArray(packs) || packs.length === 0) throw new Error('Empty pack catalog')
  const english = indexCards(en, 'en'),
    spanish = indexCards(es, 'es')
  const packCodes = new Set()
  for (const pack of packs) {
    if (!present(pack.code) || packCodes.has(pack.code))
      throw new Error(`Invalid or duplicate pack: ${pack.code}`)
    packCodes.add(pack.code)
  }
  const local = new Map(runtime.map((card) => [card.code, card]))
  const referenceCodes = new Set(reference.map((card) => card.code))
  const cards = [...english.values()]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((card) => normalize(card, spanish.get(card.code), local, referenceCodes))
  const known = new Set(cards.map((card) => card.code))
  const relationIssues = []
  for (const card of cards) {
    const targets = [
      ...Object.values(card.relations).flatMap((value) =>
        Array.isArray(value) ? value.map((v) => (typeof v === 'string' ? v : v.code)) : [value],
      ),
      ...(card.deckbuilding?.signatureGroups.flatMap((group) => group.alternatives) ?? []),
    ]
    for (const target of sort(targets))
      if (!known.has(target))
        relationIssues.push({ code: card.code, target, reason: 'not-in-player-snapshot' })
    if (!packCodes.has(card.pack)) card.modelIssues.push('unknown-pack')
    const source = english.get(card.code)
    if (source.linked_card && !known.has(source.linked_card.code))
      relationIssues.push({
        code: card.code,
        target: source.linked_card.code,
        reason: 'embedded-face-only',
      })
    if (source.linked_card && known.has(source.linked_card.code)) {
      const top = english.get(source.linked_card.code)
      if (
        ['type_code', 'pack_code', 'real_name', 'cost'].some(
          (key) => source.linked_card[key] !== undefined && source.linked_card[key] !== top[key],
        )
      )
        relationIssues.push({ code: card.code, target: top.code, reason: 'embedded-face-conflict' })
    }
  }
  const count = (items, key) =>
    items.reduce((result, card) => {
      const value = card[key]
      result[value] = (result[value] ?? 0) + 1
      return result
    }, {})
  const byPack = [...new Set(cards.map((card) => card.pack))].sort().map((pack) => {
    const subset = cards.filter((card) => card.pack === pack)
    return {
      pack,
      total: subset.length,
      localDefinitions: subset.filter((card) => card.localDefinition).length,
      localBehaviors: subset.filter((card) => card.localBehaviorRegistered).length,
      modelBlocked: subset.filter((card) => card.modelIssues.length).length,
      spanishTextDifferent: subset.filter((card) => card.translations.es.text.differsFromEnglish)
        .length,
    }
  })
  const localCodes = new Set(local.keys())
  const referenceOnly = [...referenceCodes].filter((code) => !known.has(code)).sort()
  const report = {
    schemaVersion: SCHEMA_VERSION,
    totals: {
      sourceEnglish: en.length,
      sourceSpanish: es.length,
      imported: cards.length,
      packsAvailable: packs.length,
      packsWithPlayerCards: byPack.length,
      excluded: 0,
      quarantined: cards.filter((card) => card.modelIssues.length).length,
      newlyActivated: 0,
      localDefinitions: cards.filter((card) => card.localDefinition).length,
      localBehaviors: cards.filter((card) => card.localBehaviorRegistered).length,
      referenceJsonMatches: cards.filter((card) => card.referenceJsonPresent).length,
      spanishTextDifferent: cards.filter((card) => card.translations.es.text.differsFromEnglish)
        .length,
    },
    byType: count(cards, 'type'),
    byClassification: count(cards, 'classification'),
    byPack,
    spanishOnly: [...spanish.keys()].filter((code) => !known.has(code)).sort(),
    localOnly: [...localCodes].filter((code) => !known.has(code)).sort(),
    referenceJsonOnly: referenceOnly,
    relationIssues,
    corePilot: diffCore(english, baseline),
    notes: [
      'All source rows are inventoried; model-blocked rows remain in the catalog and are never registered in the engine.',
      'Different Spanish text is a heuristic, not proof of translation quality; advertised images have not been downloaded or verified.',
      'Reference comparison uses only its partial cards.json, not its complete behavioral definitions.',
      'A registered local behavior is an observation, not verification or activation of the imported record.',
      'Complex source rules and original prose remain exclusively in the external snapshots.',
    ],
  }
  return { catalog: { schemaVersion: SCHEMA_VERSION, cards }, report }
}

export function coverageCsv(cards) {
  const keys = [
    'code',
    'pack',
    'type',
    'classification',
    'activation',
    'localDefinition',
    'localBehaviorRegistered',
    'referenceJsonPresent',
    'modelIssues',
    'requiredReview',
    'spanishTextDifferent',
  ]
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  return (
    [
      keys,
      ...cards.map((card) =>
        keys.map((key) =>
          key === 'spanishTextDifferent'
            ? card.translations.es.text.differsFromEnglish
            : Array.isArray(card[key])
              ? card[key].join('|')
              : card[key],
        ),
      ),
    ]
      .map((row) => row.map(quote).join(','))
      .join('\n') + '\n'
  )
}

export const contentHash = (value) => sha256(stableJson(value))
