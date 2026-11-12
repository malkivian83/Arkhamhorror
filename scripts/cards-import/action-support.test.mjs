import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { expect, it } from 'vitest'
import { approvedDefinition } from './approved.mjs'

const root = new URL('../../packages/cards/src/', import.meta.url)
const read = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'))

it('preserves both source fingerprints and imports twenty distinct designs/levels without duplicate codes', async () => {
  const manifest = await read('action-support/approvals.json')
  const definitions = await read('data/action-support.json')
  expect(definitions).toHaveLength(20)
  expect(new Set(definitions.map((c) => c.name + ':' + c.xp)).size).toBe(20)
  for (const lang of ['en', 'es']) {
    const bytes = await readFile(new URL(`action-support/source-${lang}.json`, root))
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

it('requires Sin-Eater’s exact Permanent/Exceptional approval and printed model', async () => {
  const manifest = await read('action-support/approvals.json')
  const catalog = await read('catalog/imports/3c8ee4b5d8100766/catalog.json')
  const card = catalog.cards.find((c) => c.code === '09094')
  const approval = manifest.cards.find((c) => c.code === '09094')
  expect(approvedDefinition(card, approval)).toMatchObject({
    exceptional: true,
    deckLimit: 1,
    xp: 3,
  })
  for (const changed of [
    { ...card, flags: { ...card.flags, permanent: false } },
    { ...card, factions: ['guardian'] },
    { ...card, numbers: { ...card.numbers, xp: { kind: 'number', value: 4 } } },
    { ...card, deckLimit: 2 },
  ])
    expect(() => approvedDefinition(changed, approval)).toThrow()
  expect(() => approvedDefinition(card, { ...approval, adapter: undefined })).toThrow()
})
