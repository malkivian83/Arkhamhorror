import { describe, expect, it } from 'vitest'
import {
  buildCatalog,
  coverageCsv,
  numberValue,
  parseSlots,
  projectCore,
  stableJson,
} from './catalog.mjs'

const card = (overrides = {}) => ({
  code: '01010',
  pack_code: 'test',
  position: 10,
  name: 'Test card',
  real_name: 'Test card',
  type_code: 'asset',
  faction_code: 'guardian',
  real_traits: 'Item. Tool.',
  real_slot: 'Hand',
  cost: 0,
  xp: 0,
  text: 'Synthetic test rule.',
  real_text: 'Synthetic test rule.',
  ...overrides,
})
const run = (en, es = en, extras = {}) =>
  buildCatalog({ en, es, packs: [{ code: 'test' }], baseline: [], ...extras })

describe('card inventory contract', () => {
  it('preserves the distinction between zero, absence, dash and symbolic numbers', () => {
    expect([0, undefined, null, -2, -3, -4].map(numberValue)).toEqual([
      { kind: 'number', value: 0 },
      { kind: 'absent' },
      { kind: 'dash' },
      { kind: 'symbol', value: 'X' },
      { kind: 'symbol', value: '*' },
      { kind: 'symbol', value: '?' },
    ])
    for (const value of [-1, '-2', '0', true, 1.5]) expect(() => numberValue(value)).toThrow()
  })

  it('keeps multiple slots and reports unsupported slots without a null engine slot', () => {
    expect(parseSlots('Hand x2. Arcane. Tarot.')).toEqual({
      slots: ['hand', 'hand', 'arcane'],
      unknown: ['Tarot'],
    })
    expect(parseSlots('Hand x0')).toEqual({ slots: [], unknown: ['Hand x0'] })
  })

  it('rejects empty inputs and duplicate identities instead of overwriting cards', () => {
    expect(() => run([])).toThrow('Empty catalog')
    expect(() => run([card(), card()])).toThrow('Duplicate card code')
    expect(() => run([card()], [])).toThrow('Empty catalog')
    expect(() => run([card({ code: 10010 })])).toThrow('Invalid card identity')
  })

  it('retains multi-class, symbolic and extended-code cards while blocking model conversion', () => {
    const { catalog } = run([
      card({ code: '01010a', faction2_code: 'seeker', cost: -2, real_slot: 'Tarot' }),
    ])
    const row = catalog.cards[0]
    expect(row.factions).toEqual(['guardian', 'seeker'])
    expect(row.numbers.cost).toEqual({ kind: 'symbol', value: 'X' })
    expect(row.modelIssues).toEqual(
      expect.arrayContaining([
        'unsupported-factions',
        'symbolic-number',
        'unsupported-slots',
        'extended-code-presentation',
      ]),
    )
    expect(row.activation).toBe('not-reviewed')
  })

  it('recognizes enemy weaknesses, signatures and dependent cards without a position filter', () => {
    const input = [
      card({ code: '01011', type_code: 'enemy', subtype_code: 'basicweakness', position: 999 }),
      card({ code: '01012', restrictions: { investigator: { '01001': '01001' } } }),
      card({ code: '01013', type_code: 'location' }),
    ]
    expect(run(input).catalog.cards.map((c) => c.classification)).toEqual([
      'basic-weakness',
      'signature',
      'dependency',
    ])
  })

  it('keeps alternative investigator requirements and flags complex options', () => {
    const investigator = card({
      code: '01001',
      type_code: 'investigator',
      deck_requirements: {
        size: 30,
        card: { '01010': { '01010': '01010', '01011': '01011' } },
        random: [{ target: 'subtype', value: 'basicweakness' }],
      },
      deck_options: [{ trait: ['Tool'], level: { min: 0, max: 3 } }],
    })
    const { catalog } = run([investigator, card(), card({ code: '01011' })])
    const row = catalog.cards[0]
    expect(row.deckbuilding.signatureGroups[0].alternatives).toEqual(['01010', '01011'])
    expect(row.deckbuilding.simpleOptions).toBeNull()
    expect(row.modelIssues).toEqual(
      expect.arrayContaining(['complex-deckbuilding', 'alternative-signatures']),
    )
  })

  it('reports missing linked cards and preserves edition codes without aliasing behavior', () => {
    const { catalog, report } = run(
      [card({ duplicate_of_code: '01020', linked_to_code: '01010b' })],
      undefined,
      {
        runtime: [{ code: '01020', behaviorRegistered: true }],
        reference: [{ code: '01010' }],
      },
    )
    expect(catalog.cards[0].relations.duplicateOf).toBe('01020')
    expect(catalog.cards[0].localBehaviorRegistered).toBe(false)
    expect(report.relationIssues).toEqual(
      expect.arrayContaining([
        { code: '01010', target: '01010b', reason: 'not-in-player-snapshot' },
      ]),
    )
    expect(report.totals.newlyActivated).toBe(0)
  })

  it('never treats an English fallback as verified Spanish or copies official prose', () => {
    const english = card({ back_text: 'Synthetic reverse.' })
    const spanish = card({ text: 'Synthetic test rule.', back_text: '' })
    const { catalog } = run([english], [spanish])
    expect(catalog.cards[0].translations.es.text).toEqual({
      present: true,
      differsFromEnglish: false,
    })
    expect(catalog.cards[0].translations.es.backText).toEqual({
      present: false,
      differsFromEnglish: false,
      required: true,
    })
    expect(stableJson(catalog)).not.toContain('Synthetic')
  })

  it('is deterministic under source reordering and accounts for every incoming row', () => {
    const input = [card(), card({ code: '01011', cost: null })]
    expect(stableJson(run(input))).toBe(stableJson(run([...input].reverse())))
    expect(run(input).report.totals).toMatchObject({
      sourceEnglish: 2,
      imported: 2,
      excluded: 0,
      quarantined: 1,
    })
    expect(coverageCsv(run(input).catalog.cards).trim().split('\n')).toHaveLength(3)
  })

  it('does not turn a non-numeric elder sign into a valid zero in the core pilot', () => {
    const investigator = card({
      type_code: 'investigator',
      real_text: '[elder_sign] effect: depends on game state',
    })
    expect(projectCore(investigator)).not.toHaveProperty('elderSignModifier')
  })

  it('isolates malformed mechanical values and unknown products', () => {
    const { catalog } = run([card({ cost: 'bad', pack_code: 'unknown' })])
    expect(catalog.cards[0].modelIssues).toContain('invalid-number:cost')
    expect(catalog.cards[0].modelIssues).toContain('unknown-pack')
  })
})
