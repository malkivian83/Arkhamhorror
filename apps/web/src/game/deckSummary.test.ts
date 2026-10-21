import { starterDeckList, type DeckList } from '@lcg/cards'
import { describe, expect, it } from 'vitest'
import { deckSummary } from './deckSummary'

const deck = (cards: string[]): DeckList => ({
  id: 'summary-test',
  name: 'Summary test',
  investigator: '12001',
  cards,
})

describe('deck list summaries', () => {
  it('distinguishes Daniela’s 30 chosen cards from her three signatures and weaknesses', () => {
    const starter = starterDeckList('daniela', 'starter', 'Daniela')
    const summary = deckSummary(starter)
    expect(starter.cards).toHaveLength(33)
    expect(summary.types).toEqual({ asset: 16, event: 7, skill: 7 })
    expect(summary.fixed).toBe(3)
    expect(summary.unknown).toBe(0)
    expect(summary.classes.reduce((n, entry) => n + entry.count, 0)).toBe(30)
  })

  it('weights costs and levels by copies, includes free events, and retains pending codes', () => {
    const summary = deckSummary(
      deck([
        '12020',
        '12020',
        '12089',
        '12026',
        '12026',
        '12096',
        '12002',
        '12003',
        'missing',
        'missing',
      ]),
    )
    expect(summary.averageCost).toBeCloseTo(1.6)
    expect(summary.experience).toBe(5)
    expect(summary.types).toEqual({ asset: 3, event: 3, skill: 0 })
    expect(summary.fixed).toBe(2)
    expect(summary.unknown).toBe(2)
    expect(summary.cards.find((card) => card.code === 'missing')).toEqual({
      code: 'missing',
      quantity: 2,
    })
    expect(summary.classes).toEqual([
      { faction: 'guardian', count: 4 },
      { faction: 'neutral', count: 2 },
    ])
  })

  it('does not invent a cost for an empty deck or a deck with only required and pending cards', () => {
    for (const cards of [[], ['12002', '12003', 'missing']]) {
      expect(deckSummary(deck(cards)).averageCost).toBeNull()
    }
  })
})
