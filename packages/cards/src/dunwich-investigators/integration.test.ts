// RR: Deckbuilding, Signature cards, Campaign Play. Official FFG starter decklists v7.
import { expect, it } from 'vitest'
import { allPlayerCardDefs, investigatorBehavior, playerCardDef } from '@lcg/engine'
import '../index'
import { isImplemented, newCampaign, startScenario } from '../campaign'
import { starterDeckList, validateDeck, investigatorCards } from '../decks'
import { STARTER_DECKS } from '../core-2026/player-cards'
import zoey from './decklist-11965.json'
import jim from './decklist-11969.json'
it.each([
  { key: 'zoey', list: zoey },
  { key: 'jim', list: jim },
])('$key preserves the exact official starter and can start a campaign', ({ key, list }) => {
  expect(STARTER_DECKS[key]!.investigatorCode).toBe(list.investigator_code)
  const d = starterDeckList(key, key, list.investigator_name)
  expect(d.cards.toSorted()).toEqual(
    [
      ...Object.entries(list.slots)
        .filter(([c]) => c !== '01000')
        .flatMap(([c, n]) => Array.from({ length: n }, () => c)),
      '12104',
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
  for (const c of signature) expect(d.cards.filter((code) => code === c)).toHaveLength(1)
})
it('both investigators allow at most five off-class level zero cards', () => {
  for (const c of ['02001', '02004']) {
    const d = playerCardDef(c)!
    expect(d.offClassLevelZeroLimit).toBe(5)
    expect(d.deckOptions).toHaveLength(1)
  }
})
it('registers all six codes once with reviewed behavior', () => {
  for (const c of ['02001', '02004', '02006', '02007', '02012', '02013']) {
    expect(allPlayerCardDefs().filter((d) => d.code === c)).toHaveLength(1)
    expect(isImplemented(c)).toBe(true)
  }
})
