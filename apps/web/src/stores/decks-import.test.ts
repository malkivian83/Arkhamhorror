import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { accountStorage } from '../account/storage'
import { useDecksStore } from './decks'

beforeEach(() => {
  accountStorage.clear()
  setActivePinia(createPinia())
})
afterEach(() => vi.unstubAllGlobals())

describe('ArkhamDB deck persistence', () => {
  it('persists pending codes and quantities rather than removing them', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          name: 'Full import',
          investigator_code: '12001',
          slots: { '12020': 2, '02019': 2 },
        }),
      }),
    )
    const store = useDecksStore(),
      result = await store.importFromArkhamDb('123')
    expect(result.ok).toBe(true)
    expect(store.decks[0]!.cards).toEqual(['12020', '12020', '02019', '02019'])
    expect(
      store
        .check(store.decks[0]!)
        .problems.some((problem) => problem.key === 'deck.problem.unknownCard'),
    ).toBe(true)
    expect(JSON.parse(accountStorage.getItem('lcg:decks')!)[0].cards).toHaveLength(4)
  })
  it('keeps a deck for an investigator that is not implemented yet', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ name: 'Future', investigator_code: '01001', slots: { '02019': 2 } }),
      }),
    )
    const store = useDecksStore()
    expect((await store.importFromArkhamDb('123')).ok).toBe(true)
    expect(store.decks[0]!.investigator).toBe('01001')
    expect(store.check(store.decks[0]!).problems).toEqual([
      { key: 'deck.problem.unknownInvestigator' },
    ])
  })
  it('rejects malformed quantities without altering saved decks', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ name: 'Bad', investigator_code: '12001', slots: { '12020': -2 } }),
      }),
    )
    const store = useDecksStore()
    expect(await store.importFromArkhamDb('123')).toEqual({ ok: false, error: 'invalidData' })
    expect(store.decks).toEqual([])
  })
  it('migrates the random-basic-weakness placeholder out of already saved decks', () => {
    accountStorage.setItem(
      'lcg:decks',
      JSON.stringify([
        {
          id: 'old',
          name: 'Old import',
          investigator: '02005',
          cards: ['01000', '02014', '02015'],
        },
      ]),
    )
    const store = useDecksStore()
    expect(store.decks[0]!.cards).toEqual(['02014', '02015'])
    expect(store.check(store.decks[0]!).needsBasicWeakness).toBe(true)
  })
})
