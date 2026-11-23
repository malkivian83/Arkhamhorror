// RR: Deckbuilding, Signature cards, Campaign Play. Official FFG starter decklists v7.
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
import silas from './decklist-51877.json'
import winifred from './decklist-31399.json'
it.each([
  { key: 'silas', list: silas },
  { key: 'winifred', list: winifred },
])('$key preserves the exact official starter and can start a campaign', ({ key, list }) => {
  expect(STARTER_DECKS[key]!.investigatorCode).toBe(list.investigator_code)
  const d = starterDeckList(key, key, list.investigator_name)
  expect(deckFromArkhamDb(list, key).unknown).toEqual([])
  expect(d.cards.toSorted()).toEqual(
    [
      ...Object.entries(list.slots)
        .filter(([c]) => c !== '01000')
        .flatMap(([c, n]) => Array.from({ length: n }, () => c)),
      ...('01000' in list.slots ? ['12104'] : []),
    ].toSorted(),
  )
  expect(validateDeck(d)).toMatchObject({ size: 30, problems: [] })
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

it('registers all eight codes once with reviewed behavior', () => {
  for (const c of ['07005', '07014', '07015', '07016', '60301', '60302', '60303', '60304']) {
    expect(allPlayerCardDefs().filter((d) => d.code === c)).toHaveLength(1)
    expect(isImplemented(c)).toBe(true)
  }
})

it.each(['07005', '60301'])(
  '%s does not offer signatures or duplicate codes in its shop',
  (code) => {
    const pool = cardPool(code),
      codes = pool.map((c) => c.code)
    expect(new Set(codes).size).toBe(codes.length)
    for (const signature of ['07014', '07015', '07016', '60302', '60303'])
      expect(codes).not.toContain(signature)
  },
)
