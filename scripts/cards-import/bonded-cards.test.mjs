import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { expect, it } from 'vitest'
import { approvedDefinition } from './approved.mjs'

const root = new URL('../../packages/cards/src/', import.meta.url)
const read = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'))

it('preserves both fingerprints: 11 distinct summoners/levels and their 6 bonded cards, no duplicates', async () => {
  const manifest = await read('bonded-cards/approvals.json')
  const definitions = await read('data/bonded-cards.json')
  expect(definitions).toHaveLength(17)
  expect(definitions.filter((c) => c.bondedCard)).toHaveLength(6)
  const keys = definitions.map((c) => c.name + ':' + c.xp + ':' + (c.subname ?? ''))
  expect(new Set(keys).size).toBe(17)
  for (const lang of ['en', 'es']) {
    const bytes = await readFile(new URL(`bonded-cards/source-${lang}.json`, root))
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

it('requires the reviewed bonded adapter and the catalog bonded relation', async () => {
  const manifest = await read('bonded-cards/approvals.json')
  const catalog = await read('catalog/imports/3c8ee4b5d8100766/catalog.json')
  const find = (code) => [
    catalog.cards.find((c) => c.code === code),
    manifest.cards.find((c) => c.code === code),
  ]
  const [mirror, mirrorApproval] = find('05313')
  expect(approvedDefinition(mirror, mirrorApproval)).toMatchObject({
    bonded: [{ code: '05314', count: 3 }],
    deckLimit: 1,
  })
  expect(() =>
    approvedDefinition(mirror, { ...mirrorApproval, bondedAdapter: undefined }),
  ).toThrow()
  expect(() =>
    approvedDefinition(
      { ...mirror, relations: { ...mirror.relations, bondedCards: [{ code: '05314', count: 2 }] } },
      mirrorApproval,
    ),
  ).toThrow()
  const [melody, melodyApproval] = find('05314')
  expect(approvedDefinition(melody, melodyApproval)).toMatchObject({ bondedCard: true })
  expect(() => approvedDefinition({ ...melody, deckLimit: 2 }, melodyApproval)).toThrow()
  // Unreviewed bonded cards (Bloodlust, a treachery) stay unsupported.
  const bloodlust = catalog.cards.find((c) => c.code === '06019')
  expect(() =>
    approvedDefinition(bloodlust, { ...melodyApproval, code: '06019', module: 'x' }),
  ).toThrow()
})
