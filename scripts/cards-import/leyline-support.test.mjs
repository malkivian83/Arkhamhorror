import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { expect, it } from 'vitest'

const root = new URL('../../packages/cards/src/', import.meta.url)
const read = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'))

it('preserves source fingerprints and eight distinct designs/levels without duplicate codes', async () => {
  const manifest = await read('leyline-support/approvals.json')
  const definitions = await read('data/leyline-support.json')
  expect(definitions).toHaveLength(8)
  expect(new Set(definitions.map((c) => c.name + ':' + c.xp + ':' + (c.subname ?? ''))).size).toBe(
    8,
  )
  for (const lang of ['en', 'es']) {
    const bytes = await readFile(new URL(`leyline-support/source-${lang}.json`, root))
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
it('keeps the one-card deck limit and researched subtitles only with the exact Conduits adapter', async () => {
  const cat = await read('catalog/imports/3c8ee4b5d8100766/catalog.json'),
    a = await read('leyline-support/approvals.json'),
    defs = await read('data/leyline-support.json')
  for (const approval of a.cards) {
    const c = cat.cards.find((c) => c.code === approval.code)
    expect(approvedDefinition(c, approval)).toEqual(defs.find((d) => d.code === approval.code))
    if (approval.adapter === 'reviewed-conduits-v1') {
      expect(() => approvedDefinition(c, { ...approval, adapter: undefined })).toThrow()
      expect(() => approvedDefinition({ ...c, deckLimit: 2 }, approval)).toThrow()
    }
  }
})
