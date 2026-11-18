import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { expect, it } from 'vitest'

const root = new URL('../../packages/cards/src/', import.meta.url)
const read = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'))

it('preserves source fingerprints and six distinct designs/levels without duplicate codes', async () => {
  const manifest = await read('encounter-search/approvals.json')
  const definitions = await read('data/encounter-search.json')
  expect(definitions).toHaveLength(6)
  expect(new Set(definitions.map((c) => c.name + ':' + c.xp + ':' + (c.subname ?? ''))).size).toBe(
    6,
  )
  for (const lang of ['en', 'es']) {
    const bytes = await readFile(new URL(`encounter-search/source-${lang}.json`, root))
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

it('preserves both Hunt levels, the Double trait and the Dilemma cost', async () => {
  const defs = await read('data/encounter-search.json')
  expect(defs.find((c) => c.code === '03263')).toMatchObject({ xp: 0, cost: 1, fast: true })
  expect(defs.find((c) => c.code === '08028')).toMatchObject({ xp: 3, cost: 0, fast: true })
  expect(defs.find((c) => c.code === '10093').traits).toContain('Double')
  expect(defs.find((c) => c.code === '09111').cost).toBeUndefined()
})
