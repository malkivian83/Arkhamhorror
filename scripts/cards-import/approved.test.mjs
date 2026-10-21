import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { approvedDefinition } from './approved.mjs'

const read = async (relative) =>
  JSON.parse(await readFile(new URL(relative, import.meta.url), 'utf8'))
describe('reviewed inventory conversion', () => {
  it.each([
    'dunwich-pilot',
    'dunwich-followup',
    'dunwich-support',
    'reprints-wave-1',
    'reprints-wave-2',
    'classic-foundations',
    'classic-equipment',
    'reactive-support',
    'combat-tools',
  ])('reproduces approved data and module/test evidence for %s', async (batch) => {
    const approvals = await read(`../../packages/cards/src/${batch}/approvals.json`)
    const inventory = await read(
      `../../packages/cards/src/catalog/imports/${approvals.sourceBundle}/catalog.json`,
    )
    const definitions = await read(`../../packages/cards/src/data/${batch}.json`)
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
          new URL(`../../packages/cards/src/${batch}/${approval.module}.ts`, import.meta.url),
        ),
      ).resolves.toBeDefined()
      await expect(
        readFile(new URL(`../../packages/cards/src/${batch}/${approval.test}`, import.meta.url)),
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
  it('requires the dedicated approval evidence for permanent reprints', async () => {
    const { cards } = await read(
      '../../packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json',
    )
    const card = cards.find((c) => c.code === '02158'),
      approval = { code: '02158', status: 'verified' }
    expect(() => approvedDefinition(card, approval)).toThrow('dedicated adapter')
    expect(() =>
      approvedDefinition(card, { ...approval, adapter: 'equivalent-permanent-v1' }),
    ).toThrow('dedicated adapter')
    const manifest = await read('../../packages/cards/src/reprints-wave-2/approvals.json')
    expect(
      approvedDefinition(
        card,
        manifest.cards.find((c) => c.code === '02158'),
      ).code,
    ).toBe('02158')
  })
})
