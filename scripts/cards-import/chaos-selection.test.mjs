import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { expect, it } from 'vitest'

const root = new URL('../../packages/cards/src/', import.meta.url)
const read = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'))

it('preserves source fingerprints and nine distinct designs/levels without duplicate codes', async () => {
  const manifest = await read('chaos-selection/approvals.json')
  const definitions = await read('data/chaos-selection.json')
  expect(definitions).toHaveLength(9)
  expect(new Set(definitions.map((c) => c.name + ':' + c.xp + ':' + (c.subname ?? ''))).size).toBe(
    9,
  )
  for (const lang of ['en', 'es']) {
    const bytes = await readFile(new URL(`chaos-selection/source-${lang}.json`, root))
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(manifest.sources[lang])
    expect(JSON.parse(bytes).map((c) => c.code)).toEqual(definitions.map((c) => c.code))
  }
  const codes = []
  for (const file of await readdir(new URL('data/', root))) {
    if (!file.endsWith('.json')) continue
    const data = await read('data/' + file)
    if (Array.isArray(data)) codes.push(...data.map((c) => c.code))
  }
  for (const c of definitions) expect(codes.filter((code) => code === c.code)).toHaveLength(1)
})
import { approvedDefinition } from './approved.mjs'
it('reproduces reviewed definitions and rejects unsupported deck limits or missing adapters', async () => {
  const cat = await read('catalog/imports/3c8ee4b5d8100766/catalog.json'),
    a = await read('chaos-selection/approvals.json'),
    defs = await read('data/chaos-selection.json')
  for (const approval of a.cards) {
    const c = cat.cards.find((c) => c.code === approval.code)
    expect(approvedDefinition(c, approval)).toEqual(defs.find((d) => d.code === approval.code))
    if (
      approval.adapter === 'reviewed-dials-v1' ||
      approval.adapter === 'reviewed-flute-v1' ||
      approval.adapter === 'reviewed-encounter-eye-v1'
    ) {
      expect(() => approvedDefinition(c, { ...approval, adapter: undefined })).toThrow()
      expect(() => approvedDefinition({ ...c, deckLimit: 2 }, approval)).toThrow()
    }
  }
})
