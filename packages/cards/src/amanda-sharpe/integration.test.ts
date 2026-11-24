// RR: Deckbuilding, Signature Cards, Campaign Play. FFG starter decklist 51874.
import { expect, it } from 'vitest'
import { allPlayerCardDefs, playerCardDef } from '@lcg/engine'
import '../index'
import { isImplemented, newCampaign, startScenario } from '../campaign'
import {
  starterDeckList,
  validateDeck,
  deckFromArkhamDb,
  investigatorCards,
  cardPool,
} from '../decks'
import { STARTER_DECKS } from '../core-2026/player-cards'
import list from './decklist-51874.json'
it('preserves the complete official starter, replacing only its random weakness placeholder', () => {
  const d = starterDeckList('amanda', 'amanda', 'Amanda')
  expect(STARTER_DECKS.amanda!.investigatorCode).toBe('07002')
  expect(deckFromArkhamDb(list, 'amanda').unknown).toEqual([])
  expect(d.cards.toSorted()).toEqual(
    [
      ...Object.entries(list.slots)
        .filter(([c]) => c !== '01000')
        .flatMap(([c, n]) => Array.from({ length: n }, () => c)),
      '12104',
    ].toSorted(),
  )
  expect(validateDeck(d)).toMatchObject({ size: 30, problems: [] })
  for (const code of [d.investigator, ...d.cards]) expect(isImplemented(code), code).toBe(true)
  expect(investigatorCards().filter((c) => c.code === '07002')).toHaveLength(1)
  const g = startScenario(newCampaign('night-of-the-zealot', ['amanda'], 'standard', 3), 3, false)
  expect(g.investigators[0]!.id).toBe('07002')
  for (const code of ['07008', '07009']) expect(d.cards.filter((c) => c === code)).toHaveLength(1)
})
it('permits only Practiced skills up to level three outside Seeker and Neutral', () => {
  const pool = cardPool('07002')
  const classes = (c: (typeof pool)[number]) => c.classes ?? [c.class]
  expect(pool.some((c) => c.code === '12025')).toBe(true)
  const off = pool.filter((c) => !classes(c).some((f) => ['seeker', 'neutral'].includes(f)))
  expect(off.length).toBeGreaterThan(0)
  for (const c of off) {
    expect(c.type).toBe('skill')
    expect(c.traits).toContain('Practiced')
    expect(c.xp ?? 0).toBeLessThanOrEqual(3)
  }
  expect(playerCardDef('07002')!.deckOptions).toContainEqual({
    classes: [],
    traits: ['Practiced'],
    type: 'skill',
    maxLevel: 3,
  })
  expect(pool.some((c) => c.code === '01020')).toBe(false)
})
it('registers three new codes once and excludes all signatures from shopping', () => {
  const signatures = new Set(allPlayerCardDefs().flatMap((c) => c.signatures ?? []))
  const pool = cardPool('07002')
  expect(pool.every((c) => !signatures.has(c.code))).toBe(true)
  expect(new Set(pool.map((c) => c.code)).size).toBe(pool.length)
  for (const code of ['07002', '07008', '07009']) {
    expect(allPlayerCardDefs().filter((c) => c.code === code)).toHaveLength(1)
    expect(isImplemented(code)).toBe(true)
  }
})
