import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { expect, it } from 'vitest'

const root = new URL('../../packages/cards/src/', import.meta.url)
const read = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'))

it('preserves source fingerprints and twelve distinct designs/levels without duplicate codes', async () => {
  const manifest = await read('field-support/approvals.json')
  const definitions = await read('data/field-support.json')
  expect(definitions).toHaveLength(12)
  expect(new Set(definitions.map((c) => c.name + ':' + c.xp + ':' + (c.subname ?? ''))).size).toBe(
    12,
  )
  for (const lang of ['en', 'es']) {
    const bytes = await readFile(new URL(`field-support/source-${lang}.json`, root))
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
