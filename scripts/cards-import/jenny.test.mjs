import { readFile } from 'node:fs/promises'
import { expect, it } from 'vitest'
import { approvedJennyDefinitions } from './jenny.mjs'
const read = async (p) => JSON.parse(await readFile(new URL(p, import.meta.url), 'utf8'))
it('reproduces Jenny, her original signatures and the decklist 1179 cards from the inventory', async () => {
  const a = await read('../../packages/cards/src/jenny-barnes/approvals.json')
  const inventory = await read(
    `../../packages/cards/src/catalog/imports/${a.sourceBundle}/catalog.json`,
  )
  const defs = await read('../../packages/cards/src/data/jenny-barnes.json')
  expect(approvedJennyDefinitions(inventory, a)).toEqual(defs)
  expect(a.cards.map((c) => c.code)).toEqual(defs.map((c) => c.code))
  for (const card of a.cards)
    for (const path of [card.module + '.ts', card.test])
      await expect(
        readFile(new URL('../../packages/cards/src/jenny-barnes/' + path, import.meta.url), 'utf8'),
      ).resolves.toBeTruthy()
  const unreviewed = { ...a, cards: a.cards.map((c) => ({ ...c, adapter: undefined })) }
  expect(() => approvedJennyDefinitions(inventory, unreviewed)).toThrow('cost')
})
