import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { approvedDefinition } from './approved.mjs'

const read = async (relative) =>
  JSON.parse(await readFile(new URL(relative, import.meta.url), 'utf8'))
describe('reviewed inventory conversion', () => {
  it('reproduces precisely the approved data and verifies the module/test evidence exists', async () => {
    const approvals = await read('../../packages/cards/src/dunwich-pilot/approvals.json')
    const inventory = await read(
      `../../packages/cards/src/catalog/imports/${approvals.sourceBundle}/catalog.json`,
    )
    const definitions = await read('../../packages/cards/src/data/dunwich-pilot.json')
    expect(
      approvals.cards.map((approval) =>
        approvedDefinition(
          inventory.cards.find((card) => card.code === approval.code),
          approval,
        ),
      ),
    ).toEqual(definitions)
    for (const approval of approvals.cards) {
      await expect(
        readFile(
          new URL(`../../packages/cards/src/dunwich-pilot/${approval.module}.ts`, import.meta.url),
        ),
      ).resolves.toBeDefined()
      await expect(
        readFile(
          new URL(`../../packages/cards/src/dunwich-pilot/${approval.test}`, import.meta.url),
        ),
      ).resolves.toBeDefined()
    }
  })
  it('requires approval and rejects symbolic data before creating a playable definition', async () => {
    const { cards } = await read(
      '../../packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json',
    )
    const card = cards.find((card) => card.code === '02116')
    expect(() => approvedDefinition(card, { code: card.code, status: 'pending' })).toThrow(
      'not approved',
    )
    expect(() =>
      approvedDefinition(
        { ...card, numbers: { ...card.numbers, cost: { kind: 'symbol', value: 'X' } } },
        { code: card.code, status: 'verified' },
      ),
    ).toThrow('Unsupported cost')
  })
})
