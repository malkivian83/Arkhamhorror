import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { expect, it } from 'vitest'
import { approvedDefinition } from './approved.mjs'

const root = new URL('../../packages/cards/src/', import.meta.url)
const read = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'))

it('preserves source fingerprints and eighteen distinct designs/levels without duplicate codes', async () => {
  const manifest = await read('movement-support/approvals.json')
  const definitions = await read('data/movement-support.json')
  expect(definitions).toHaveLength(18)
  expect(new Set(definitions.map((c) => c.name + ':' + c.xp)).size).toBe(18)
  for (const lang of ['en', 'es']) {
    const bytes = await readFile(new URL(`movement-support/source-${lang}.json`, root))
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

it('requires reviewed adapters for the group of Gates, four Dogs and dual-faction cards', async () => {
  const manifest = await read('movement-support/approvals.json')
  const catalog = await read('catalog/imports/3c8ee4b5d8100766/catalog.json')
  for (const code of ['06029', '08127', '08084', '08085', '08097', '08099', '08118']) {
    const card = catalog.cards.find((c) => c.code === code)
    const approval = manifest.cards.find((c) => c.code === code)
    expect(() => approvedDefinition(card, approval)).not.toThrow()
    expect(() => approvedDefinition(card, { ...approval, adapter: undefined })).toThrow()
    expect(() => approvedDefinition({ ...card, factions: ['guardian'] }, approval)).toThrow()
  }
  const dog = catalog.cards.find((c) => c.code === '08127')
  const approval = manifest.cards.find((c) => c.code === '08127')
  expect(approvedDefinition(dog, approval).deckLimit).toBe(4)
  expect(() => approvedDefinition({ ...dog, deckLimit: 2 }, approval)).toThrow()
})
