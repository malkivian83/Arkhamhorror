import { readFile, readdir } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { approvedDefinition } from './approved.mjs'

const read = async (relative) =>
  JSON.parse(await readFile(new URL(relative, import.meta.url), 'utf8'))
describe('reviewed inventory conversion', () => {
  it('accepts the reviewed cost X of A Chance Encounter only with its explicit adapter', async () => {
    const { cards } = await read(
      '../../packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json',
    )
    const card = cards.find((c) => c.code === '03238')
    const approval = { code: '03238', status: 'verified', adapter: 'reviewed-chance-x-v1' }
    expect(approvedDefinition(card, approval)).toMatchObject({
      code: '03238',
      cost: 0,
      printedCostX: true,
      xp: 2,
    })
    expect(() => approvedDefinition(card, { ...approval, adapter: undefined })).toThrow()
    expect(() =>
      approvedDefinition({ ...card, code: '99999' }, { ...approval, code: '99999' }),
    ).toThrow()
  })
  it('limits conditional-asset Myriad, Exceptional and Permanent adapters to exact identities', async () => {
    const { cards } = await read(
      '../../packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json',
    )
    const approvals = await read('../../packages/cards/src/conditional-assets/approvals.json')
    for (const a of approvals.cards.filter((a) => a.adapter)) {
      const card = cards.find((c) => c.code === a.code)
      expect(approvedDefinition(card, a).code).toBe(card.code)
      expect(() => approvedDefinition(card, { ...a, adapter: undefined })).toThrow()
      expect(() =>
        approvedDefinition({ ...card, code: '99999' }, { ...a, code: '99999' }),
      ).toThrow()
      expect(() => approvedDefinition({ ...card, factions: ['invalid'] }, a)).toThrow()
    }
    const horse = cards.find((c) => c.code === '10127'),
      a = approvals.cards.find((a) => a.code === '10127')
    expect(() =>
      approvedDefinition(
        { ...horse, numbers: { ...horse.numbers, xp: { kind: 'number', value: 0 } } },
        a,
      ),
    ).toThrow()
  })
  it('limits Myriad and defined-X conversion to exact reviewed cards', async () => {
    const { cards } = await read(
      '../../packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json',
    )
    const approvals = await read('../../packages/cards/src/token-skills/approvals.json')
    for (const a of approvals.cards.filter((c) => c.adapter)) {
      const c = cards.find((c) => c.code === a.code)
      expect(approvedDefinition(c, a)).toMatchObject({ myriad: true, deckLimit: 3 })
      expect(() => approvedDefinition(c, { ...a, adapter: undefined })).toThrow()
      expect(() => approvedDefinition({ ...c, code: '99999' }, { ...a, code: '99999' })).toThrow()
      expect(() => approvedDefinition({ ...c, deckLimit: 2 }, a)).toThrow()
    }
    const c = cards.find((c) => c.code === '06034'),
      a = approvals.cards.find((c) => c.code === '06034')
    expect(approvedDefinition(c, a)).toMatchObject({ cost: 0, printedCostX: true })
    expect(() =>
      approvedDefinition(
        { ...c, numbers: { ...c.numbers, cost: { kind: 'symbol', value: 'Y' } } },
        a,
      ),
    ).toThrow()
  })
  it('limits the new Memento and dual-faction adapters to exact reviewed identities', async () => {
    const { cards } = await read(
      '../../packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json',
    )
    const approvals = await read('../../packages/cards/src/test-recovery/approvals.json')
    for (const a of approvals.cards.filter((c) => c.adapter)) {
      const c = cards.find((c) => c.code === a.code)
      expect(approvedDefinition(c, a).code).toBe(c.code)
      expect(() => approvedDefinition(c, { ...a, adapter: undefined })).toThrow()
      if (a.adapter === 'reviewed-memento-v1')
        expect(() => approvedDefinition(c, { ...a, subname: 'Other' })).toThrow()
      if (a.adapter === 'reviewed-memento-v1')
        expect(() =>
          approvedDefinition({ ...c, code: '99999' }, { ...a, code: '99999', subname: undefined }),
        ).toThrow()
    }
  })
  it('restricts protection exile and Ice Pick adapters to their reviewed cards', async () => {
    const { cards } = await read(
      '../../packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json',
    )
    const approvals = await read('../../packages/cards/src/protection-tools/approvals.json')
    for (const code of ['02114', '03156', '03157', '08080', '08107']) {
      const c = cards.find((c) => c.code === code),
        a = approvals.cards.find((c) => c.code === code)
      expect(approvedDefinition(c, a).code).toBe(code)
      expect(() => approvedDefinition(c, { ...a, adapter: undefined })).toThrow()
    }
    const other = cards.find((c) => c.code === '03156')
    expect(() =>
      approvedDefinition(
        { ...other, code: '99999' },
        { code: '99999', status: 'verified', adapter: 'reviewed-protection-exile-v1' },
      ),
    ).toThrow()
  })
  it('limits the new exile, exceptional and dual-faction adapters to reviewed identities', async () => {
    const { cards } = await read(
      '../../packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json',
    )
    const approvals = await read('../../packages/cards/src/resource-reactions/approvals.json')
    for (const code of ['05236', '04308', '08095', '08117', '08119']) {
      const c = cards.find((c) => c.code === code),
        a = approvals.cards.find((c) => c.code === code)
      expect(approvedDefinition(c, a).code).toBe(code)
      expect(() => approvedDefinition(c, { ...a, adapter: undefined })).toThrow()
    }
    const other = cards.find((c) => c.code === '02305')
    expect(() =>
      approvedDefinition(other, {
        code: other.code,
        status: 'verified',
        adapter: 'reviewed-borrowed-time-v1',
      }),
    ).toThrow()
  })
  it('restricts triple-faction talents to five exact reviewed identities', async () => {
    const { cards } = await read(
      '../../packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json',
    )
    const approvals = await read('../../packages/cards/src/charged-assets/approvals.json')
    const selected = approvals.cards.filter((c) => c.adapter === 'reviewed-talent-factions-v1')
    expect(selected).toHaveLength(5)
    for (const a of selected) {
      const c = cards.find((c) => c.code === a.code)
      expect(approvedDefinition(c, a).classes).toEqual(c.factions)
      expect(() => approvedDefinition(c, { ...a, adapter: undefined })).toThrow()
      expect(() =>
        approvedDefinition({ ...c, factions: ['guardian', 'seeker', 'rogue'] }, a),
      ).toThrow()
    }
    const other = cards.find((c) => c.code === '01093')
    expect(() =>
      approvedDefinition(
        { ...other, factions: ['guardian', 'mystic', 'survivor'] },
        { code: other.code, status: 'verified', adapter: 'reviewed-talent-factions-v1' },
      ),
    ).toThrow()
  })
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
    'synergy',
    'synergy-attacks',
    'next-test-effects',
    'attack-history',
    'protected-draw',
    'action-history',
    'immediate-action-skills',
    'immediate-action-events',
    'backup-events',
    'grouped-import',
    'upgraded-variants',
    'reused-mechanics',
    'damage-turn',
    'tools-parley',
    'charged-assets',
    'resource-reactions',
    'protection-tools',
    'test-recovery',
    'services-parley',
    'token-skills',
    'conditional-assets',
    'deck-divination',
    'secret-scrolls',
    'therapeutic-recovery',
    'improvised-survival',
    'slot-search',
    'enemy-relocation',
    'warning-shot',
    'chance-encounter',
    'temporary-skills',
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
  it('accepts only the reviewed Tarot slots and Medical Student dual faction', async () => {
    const { cards } = await read(
      '../../packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json',
    )
    const approvals = await read('../../packages/cards/src/damage-turn/approvals.json')
    for (const code of ['05023', '05027', '05031', '05035', '05039', '54003', '54005', '08083']) {
      const card = cards.find((c) => c.code === code),
        approval = approvals.cards.find((c) => c.code === code)
      expect(() => approvedDefinition(card, { ...approval, adapter: undefined })).toThrow()
      const def = approvedDefinition(card, approval)
      if (code === '08083') expect(def.classes).toEqual(['guardian', 'seeker'])
      else expect(def.slots).toEqual(['tarot'])
      expect(() =>
        approvedDefinition({ ...card, code: 'unreviewed' }, { ...approval, code: 'unreviewed' }),
      ).toThrow()
    }
  })
  it('limits the new dual-faction adapter to five reviewed cards and their exact factions', async () => {
    const { cards } = await read(
      '../../packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json',
    )
    const approvals = await read('../../packages/cards/src/tools-parley/approvals.json')
    const selected = approvals.cards.filter((c) => c.adapter === 'reviewed-dual-faction-v1')
    expect(selected).toHaveLength(5)
    for (const a of selected) {
      const c = cards.find((c) => c.code === a.code)
      expect(approvedDefinition(c, a).classes).toEqual(c.factions)
      expect(() => approvedDefinition(c, { ...a, adapter: undefined })).toThrow()
      expect(() => approvedDefinition({ ...c, factions: ['mystic', 'seeker'] }, a)).toThrow()
    }
  })
})
