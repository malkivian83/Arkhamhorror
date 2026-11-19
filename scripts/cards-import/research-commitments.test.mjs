import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { expect, it } from 'vitest'

const root = new URL('../../packages/cards/src/', import.meta.url)
const read = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'))

it('preserves source fingerprints and nine distinct designs/levels without duplicate codes', async () => {
  const manifest = await read('research-commitments/approvals.json')
  const definitions = await read('data/research-commitments.json')
  expect(definitions).toHaveLength(9)
  expect(new Set(definitions.map((c) => c.name + ':' + c.xp + ':' + (c.subname ?? ''))).size).toBe(
    9,
  )
  for (const lang of ['en', 'es']) {
    const bytes = await readFile(new URL(`research-commitments/source-${lang}.json`, root))
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

it('preserves both Myriad cards and the exact printed secret/charge pools', async () => {
  const defs = await read('data/research-commitments.json')
  for (const code of ['06023', '06278'])
    expect(defs.find((c) => c.code === code)).toMatchObject({ myriad: true, deckLimit: 3 })
  expect(defs.find((c) => c.code === '05153').uses).toEqual({ count: 3, type: 'secret' })
  expect(defs.find((c) => c.code === '07223').uses).toEqual({ count: 4, type: 'secret' })
  expect(defs.find((c) => c.code === '09032').uses).toEqual({ count: 4, type: 'charge' })
})
