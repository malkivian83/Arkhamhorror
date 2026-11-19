import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { expect, it } from 'vitest'

const root = new URL('../../packages/cards/src/', import.meta.url)
const read = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'))

it('preserves source fingerprints and thirteen distinct designs/levels without duplicate codes', async () => {
  const manifest = await read('asset-containers/approvals.json')
  const definitions = await read('data/asset-containers.json')
  expect(definitions).toHaveLength(13)
  expect(new Set(definitions.map((c) => c.name + ':' + c.xp + ':' + (c.subname ?? ''))).size).toBe(
    13,
  )
  for (const lang of ['en', 'es']) {
    const bytes = await readFile(new URL(`asset-containers/source-${lang}.json`, root))
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

it('preserves the two Backpack levels, Mob Exceptional cost and Jury-Rig uses', async () => {
  const defs = await read('data/asset-containers.json')
  expect(defs.find((c) => c.code === '04037')).toMatchObject({ xp: 0, cost: 2 })
  expect(defs.find((c) => c.code === '53011')).toMatchObject({ xp: 2, cost: 1 })
  expect(defs.find((c) => c.code === '11059')).toMatchObject({
    xp: 2,
    exceptional: true,
    deckLimit: 1,
  })
  expect(defs.find((c) => c.code === '08074').uses).toEqual({ count: 3, type: 'durability' })
  expect(defs.find((c) => c.code === '08089').classes).toEqual(['guardian', 'rogue'])
})
