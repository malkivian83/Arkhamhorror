import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { expect, it } from 'vitest'
import { approvedDefinition } from './approved.mjs'

const root = new URL('../../packages/cards/src/', import.meta.url)
const read = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'))

it('preserves source fingerprints and twenty distinct designs/levels without duplicate codes', async () => {
  const manifest = await read('chaos-allies/approvals.json')
  const definitions = await read('data/chaos-allies.json')
  expect(definitions).toHaveLength(20)
  expect(new Set(definitions.map((c) => c.name + ':' + c.xp + ':' + (c.subname ?? ''))).size).toBe(
    20,
  )
  for (const lang of ['en', 'es']) {
    const bytes = await readFile(new URL(`chaos-allies/source-${lang}.json`, root))
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

it('imports fourteen distinct designs and six bonded cards with strict adapters', async () => {
  const manifest = await read('chaos-allies/approvals.json'),
    catalog = await read('catalog/imports/3c8ee4b5d8100766/catalog.json'),
    defs = await read('data/chaos-allies.json')
  expect(defs.filter((c) => c.bondedCard)).toHaveLength(6)
  for (const code of [
    '06030',
    '06031',
    '06032',
    '06033',
    '10105',
    '10106',
    '10107',
    '10133',
    '10134',
    '06328',
  ]) {
    const card = catalog.cards.find((c) => c.code === code),
      approval = manifest.cards.find((c) => c.code === code)
    expect(() => approvedDefinition(card, approval)).not.toThrow()
    expect(() =>
      approvedDefinition(card, { ...approval, bondedAdapter: undefined, adapter: undefined }),
    ).toThrow()
  }
  const eye = catalog.cards.find((c) => c.code === '06328'),
    approval = manifest.cards.find((c) => c.code === '06328')
  expect(() =>
    approvedDefinition(
      { ...eye, numbers: { ...eye.numbers, xp: { kind: 'number', value: 0 } } },
      approval,
    ),
  ).toThrow()
})
