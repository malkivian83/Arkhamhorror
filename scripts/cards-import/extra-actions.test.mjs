import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { expect, it } from 'vitest'
import { approvedDefinition } from './approved.mjs'

const root = new URL('../../packages/cards/src/', import.meta.url)
const read = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'))

it('preserves source fingerprints and eight distinct designs/levels without duplicate codes', async () => {
  const manifest = await read('extra-actions/approvals.json')
  const definitions = await read('data/extra-actions.json')
  expect(definitions).toHaveLength(8)
  expect(new Set(definitions.map((c) => c.name + ':' + c.xp + ':' + (c.subname ?? ''))).size).toBe(
    8,
  )
  for (const lang of ['en', 'es']) {
    const bytes = await readFile(new URL(`extra-actions/source-${lang}.json`, root))
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

it('preserves the reviewed Tarot slot and both dual-faction Chart levels', async () => {
  const manifest = await read('extra-actions/approvals.json'),
    catalog = await read('catalog/imports/3c8ee4b5d8100766/catalog.json'),
    defs = await read('data/extra-actions.json')
  expect(defs.some((c) => c.bondedCard)).toBe(false)
  for (const code of ['05040', '08098', '08100']) {
    const card = catalog.cards.find((c) => c.code === code),
      a = manifest.cards.find((c) => c.code === code)
    expect(() => approvedDefinition(card, a)).not.toThrow()
    expect(() => approvedDefinition(card, { ...a, adapter: undefined })).toThrow()
  }
})
