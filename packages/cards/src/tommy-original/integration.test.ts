// RR: Deckbuilding, Signature Cards, Myriad and Campaign Play. Official FFG decklist 50689.
import { expect, it } from 'vitest'
import { allPlayerCardDefs, playerCardDef } from '@lcg/engine'
import '../index'
import { isImplemented, newCampaign, startScenario } from '../campaign'
import { starterDeckList, validateDeck, deckFromArkhamDb, cardPool } from '../decks'
import list from './decklist-50689.json'
it('starts the exact official original deck, substituting only the random weakness placeholder', () => {
  const d = starterDeckList('tommy-original', 'original', 'Tommy')
  expect(d.investigator).toBe('06001')
  expect(deckFromArkhamDb(list, 'original').unknown).toEqual([])
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
  expect(d.cards.filter((c) => c === '06020')).toHaveLength(3)
  expect(
    startScenario(newCampaign('night-of-the-zealot', ['tommy-original'], 'standard', 3), 3, false)
      .investigators[0]!.id,
  ).toBe('06001')
  expect(starterDeckList('tommy', 'new', 'Tommy').investigator).toBe('60151')
})
it('respects original Guardian/Survivor access and Myriad’s three-copy limit', () => {
  const pool = cardPool('06001')
  expect(pool.some((c) => c.code === '06020')).toBe(true)
  expect(playerCardDef('06020')).toMatchObject({ deckLimit: 3, myriad: true, fast: true })
  for (const c of pool) {
    const f = c.classes ?? [c.class]
    expect(
      f.includes('guardian') ||
        f.includes('neutral') ||
        ((c.xp ?? 0) <= 2 && f.includes('survivor')),
    ).toBe(true)
  }
  const d = starterDeckList('tommy-original', 'original', 'Tommy')
  expect(validateDeck({ ...d, cards: [...d.cards, '06020'] }).problems.length).toBeGreaterThan(0)
})
it('registers each code once and keeps signatures out of every shop', () => {
  const signatures = new Set(allPlayerCardDefs().flatMap((c) => c.signatures ?? [])),
    pool = cardPool('06001')
  expect(pool.every((c) => !signatures.has(c.code))).toBe(true)
  expect(new Set(pool.map((c) => c.code)).size).toBe(pool.length)
  for (const code of ['06001', '06006', '06007', '06020'])
    expect(allPlayerCardDefs().filter((c) => c.code === code)).toHaveLength(1)
})
