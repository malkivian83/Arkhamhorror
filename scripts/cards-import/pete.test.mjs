import { readFile } from 'node:fs/promises'
import { expect, it } from 'vitest'
import { approvedPeteDefinitions } from './pete.mjs'
const read = async (p) => JSON.parse(await readFile(new URL(p, import.meta.url), 'utf8'))
it('reproduces Pete and both reviewed original signatures from the frozen inventory', async () => {
  const a = await read('../../packages/cards/src/ashcan-pete/approvals.json')
  const inventory = await read(
    `../../packages/cards/src/catalog/imports/${a.sourceBundle}/catalog.json`,
  )
  const defs = await read('../../packages/cards/src/data/ashcan-pete.json')
  expect(approvedPeteDefinitions(inventory)).toEqual(defs)
  expect(a.cards.map((c) => c.code)).toEqual(defs.map((c) => c.code))
  for (const card of a.cards)
    for (const path of [card.module + '.ts', card.test])
      await expect(
        readFile(new URL('../../packages/cards/src/ashcan-pete/' + path, import.meta.url), 'utf8'),
      ).resolves.toBeTruthy()
})
