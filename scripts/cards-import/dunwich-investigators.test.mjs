// RR: Investigator setup and deckbuilding. Immutable official source snapshots.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { expect, it } from 'vitest'
const root = new URL('../../packages/cards/src/dunwich-investigators/', import.meta.url)
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'))
const approvals = read('approvals.json'),
  source = read('source-en.json')
it.each(['en', 'es'])('%s sources preserve their fingerprints and reviewed codes', (lang) => {
  const bytes = readFileSync(new URL('source-' + lang + '.json', root))
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(approvals.sources[lang])
  expect(JSON.parse(bytes).map((c) => c.code)).toEqual(source.map((c) => c.code))
  const codes = approvals.cards.map((c) => c.code)
  expect(new Set(codes).size).toBe(6)
  const defs = JSON.parse(readFileSync(new URL('../data/dunwich-investigators.json', root), 'utf8'))
  expect(defs.map((c) => c.code)).toEqual(codes)
  for (const c of source) {
    const def = defs.find((d) => d.code === c.code)
    expect(def.name).toBe(c.name)
    expect(def.type).toBe(c.type_code)
    if (c.type_code === 'investigator') {
      expect(def.health).toBe(c.health)
      expect(def.sanity).toBe(c.sanity)
      for (const k of ['willpower', 'intellect', 'combat', 'agility'])
        expect(def.skills[k]).toBe(c['skill_' + k])
    }
  }
})
import { readdirSync } from 'node:fs'
it('does not duplicate any of the six codes in other imported data files', () => {
  const data = new URL('../data/', root),
    all = []
  for (const file of readdirSync(data)) {
    if (!file.endsWith('.json')) continue
    const rows = JSON.parse(readFileSync(new URL(file, data), 'utf8'))
    if (Array.isArray(rows)) all.push(...rows.map((c) => c.code))
  }
  for (const c of source) expect(all.filter((code) => code === c.code)).toHaveLength(1)
})
