import { readFile, readdir } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { approvedDefinition } from './approved.mjs'

const read = async (relative) =>
  JSON.parse(await readFile(new URL(relative, import.meta.url), 'utf8'))
describe('reviewed inventory conversion', () => {
  it('rejects codes repeated between published batch data files', async () => {
    const dir = new URL('../../packages/cards/src/data/', import.meta.url)
    const codes = []
    for (const file of await readdir(dir)) {
      if (!file.endsWith('.json')) continue
      const data = JSON.parse(await readFile(new URL(file, dir), 'utf8'))
      if (Array.isArray(data)) codes.push(...data.map((c) => c.code))
    }
    expect(new Set(codes).size).toBe(codes.length)
  })
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
    'conditional-commit',
    'variable-icons',
    'context-skills',
    'result-skills',
    'test-modifiers',
    'distributed-results',
    'basic-action-skills',
    'movement-skills',
    'reactive-events',
    'direct-events',
    'search-assets',
    'attached-upgrades',
    'survivor-deck',
    'basic-abilities',
    'basic-events',
    'asset-utilities',
    'phase-bonuses',
    'permanent-talents',
    'sequenced-events',
    'restricted-slots',
    'starter-actions',
    'simple-assets',
    'support-allies',
    'skill-tricks',
    'direct-effects',
    'round-effects',
    'skill-replacement',
    'skill-utilities',
    'exclusive-skills',
    'targeted-events',
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
  it('restricts creation-permanent and dual-faction adapters to their reviewed cards', async () => {
    const { cards } = await read(
      '../../packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json',
    )
    const reviewed = await read('../../packages/cards/src/survivor-deck/approvals.json')
    for (const code of ['08071', '08125', '08105']) {
      const card = cards.find((c) => c.code === code)
      const approval = reviewed.cards.find((c) => c.code === code)
      expect(approvedDefinition(card, approval).code).toBe(code)
      expect(() => approvedDefinition(card, { ...approval, adapter: undefined })).toThrow()
    }
    const unrelated = cards.find((c) => c.code === '02158')
    expect(() =>
      approvedDefinition(unrelated, {
        code: unrelated.code,
        status: 'verified',
        adapter: 'reviewed-creation-permanent-v1',
      }),
    ).toThrow('dedicated adapter')
  })
})
