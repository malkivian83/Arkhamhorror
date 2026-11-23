// RR: Deckbuilding, Signature cards, Campaign Play. Published community decks 34729 / 35838.
import { expect, it } from 'vitest'
import { allPlayerCardDefs, investigatorBehavior, playerCardDef } from '@lcg/engine'
import '../index'
import { isImplemented, newCampaign, startScenario } from '../campaign'
import {
  starterDeckList,
  validateDeck,
  investigatorCards,
  deckFromArkhamDb,
  cardPool,
} from '../decks'
import { STARTER_DECKS } from '../core-2026/player-cards'
import daniela from './decklist-34729.json'
import monterey from './decklist-35838.json'
it.each([
  { key: 'daniela-original', list: daniela },
  { key: 'monterey', list: monterey },
])('$key preserves the exact published starter and can start a campaign', ({ key, list }) => {
  expect(STARTER_DECKS[key]!.investigatorCode).toBe(list.investigator_code)
  const d = starterDeckList(key, key, list.investigator_name)
  expect(deckFromArkhamDb(list, key).unknown).toEqual([])
  expect(d.cards.toSorted()).toEqual(
    [
      ...Object.entries(list.slots)
        .filter(([c]) => c !== '01000')
        .flatMap(([c, n]) => Array.from({ length: n }, () => c)),
      '12104',
    ].toSorted(),
  )
  expect(validateDeck(d)).toMatchObject({ size: key === 'monterey' ? 25 : 30, problems: [] })
  for (const c of [d.investigator, ...d.cards]) expect(isImplemented(c), c).toBe(true)
  expect(investigatorCards().filter((c) => c.code === d.investigator)).toHaveLength(1)
  const campaign = newCampaign('night-of-the-zealot', [key], 'standard', 3),
    game = startScenario(campaign, 3, false)
  expect(game.investigators[0]!.id).toBe(d.investigator)
  expect(investigatorBehavior(d.investigator)).toBeDefined()
  const signature = playerCardDef(d.investigator)!.signatures!
  for (const c of new Set(signature))
    expect(d.cards.filter((code) => code === c)).toHaveLength(
      signature.filter((code) => code === c).length,
    )
})

it.each([
  ['08001', 'daniela-original', 'guardian', 'survivor'],
  ['08007', 'monterey', 'rogue', 'seeker'],
])(
  '%s caps the new level-zero class at five cards, but upgrades into levels 1–5',
  (code, key, primary, secondary) => {
    const pool = cardPool(code!),
      classes = (c: (typeof pool)[number]) => c.classes ?? [c.class]
    expect(pool.some((c) => classes(c).includes(secondary!) && (c.xp ?? 0) > 0)).toBe(true)
    expect(
      pool
        .filter((c) => (c.xp ?? 0) > 0)
        .every((c) => classes(c).some((f) => f === secondary || f === 'neutral')),
    ).toBe(true)
    const off = pool.filter(
      (c) =>
        (c.xp ?? 0) === 0 &&
        classes(c).includes(secondary!) &&
        !classes(c).some((f) => f === primary || f === 'neutral'),
    )
    expect(off.length).toBeGreaterThan(5)
    const d = starterDeckList(key!, 'test', key!)
    for (const n of [5, 6])
      expect(
        validateDeck({ ...d, cards: off.slice(0, n).map((c) => c.code) }).problems.some(
          (p) => p.key === 'deck.problem.offClassLimit',
        ),
      ).toBe(n === 6)
  },
)

it('preserves Daniela 2026 separately from her original Edge of the Earth profile', () => {
  expect(starterDeckList('daniela', '2026', 'Daniela').investigator).toBe('12001')
  expect(starterDeckList('daniela-original', 'original', 'Daniela').investigator).toBe('08001')
})

it('offers the new standard event once to Daniela and keeps it outside Monterey’s classes', () => {
  expect(cardPool('08001').filter((c) => c.code === '08021')).toHaveLength(1)
  expect(cardPool('08007').some((c) => c.code === '08021')).toBe(false)
})

it('registers all seven codes once with reviewed behavior', () => {
  for (const c of ['08001', '08002', '08003', '08007', '08008', '08009', '08021']) {
    expect(allPlayerCardDefs().filter((d) => d.code === c)).toHaveLength(1)
    expect(isImplemented(c)).toBe(true)
  }
})

it.each(['08001', '08007'])(
  '%s does not offer signatures or duplicate codes in its shop',
  (code) => {
    const pool = cardPool(code),
      codes = pool.map((c) => c.code)
    expect(new Set(codes).size).toBe(codes.length)
    for (const signature of ['08002', '08003', '08008', '08009'])
      expect(codes).not.toContain(signature)
  },
)
