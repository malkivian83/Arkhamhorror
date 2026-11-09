import { allPlayerCardDefs, playerCardBehavior } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { STARTER_DECKS } from '../core-2026/player-cards'
import { RENDERED_PLAYER_CARD_CODES } from '../index'
import { reprintSource } from '../reprints'
import approvals from './approvals.json'

// One data entry per code across every data batch is checked in
// scripts/cards-import/marie-lambeau-2025.test.mjs (it reads the data directory).
const codes = new Set(approvals.cards.map((c) => c.code))
const others = allPlayerCardDefs().filter((d) => !codes.has(d.code))

describe('Marie Lambeau starter deck lot: codes and families', () => {
  it('registers each code once in the rendered catalogue', () => {
    expect(codes.size).toBe(approvals.cards.length)
    for (const code of codes)
      expect(
        RENDERED_PLAYER_CARD_CODES.filter((c) => c === code),
        code,
      ).toHaveLength(1)
  })

  it('separates new distinct cards from the two reviewed reprints', () => {
    const families = new Set(others.map((c) => reprintSource(c.code)))
    const reprints = approvals.cards.filter((c) => 'behaviorSource' in c)
    expect(reprints.map((c) => c.code)).toEqual(['60455', '60469'])
    for (const card of reprints) {
      const source = (card as { behaviorSource: string }).behaviorSource
      expect(reprintSource(card.code)).toBe(source)
      expect(families.has(source)).toBe(true)
      expect(playerCardBehavior(source)).toBeDefined()
    }
    const distinct = approvals.cards.filter((c) => !('behaviorSource' in c))
    expect(distinct).toHaveLength(8)
    for (const card of distinct)
      expect(families.has(reprintSource(card.code)), card.code).toBe(false)
  })

  it('keeps one starter deck per investigator code', () => {
    const defined = Object.values(STARTER_DECKS)
      .map((d) => d.investigatorCode)
      .filter(Boolean)
    expect(new Set(defined).size).toBe(defined.length)
  })
})
