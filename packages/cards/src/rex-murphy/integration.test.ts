// RR: Deckbuilding, Campaign Setup. Preserve exact ArkhamDB codes.
import { expect, it } from 'vitest'
import { playerCardDef } from '@lcg/engine'
import { isImplemented, newCampaign, startScenario, purchaseOptions } from '../campaign'
import { cardPool, deckFromArkhamDb, validateDeck, starterDeckList } from '../decks'
import data from './decklist-21596.json'
import './testing'
it('imports the complete list and starts a campaign with a real weakness', () => {
  const { deck, unknown } = deckFromArkhamDb(data, '21596')
  expect(unknown).toEqual([])
  expect(validateDeck(deck)).toMatchObject({ problems: [], size: 30, needsBasicWeakness: true })
  for (const code of ['02002', ...deck.cards]) expect(isImplemented(code), code).toBe(true)
  expect(validateDeck(starterDeckList('rex', 'rex', 'Rex')).problems).toEqual([])
  const campaign = newCampaign('brethren-of-ash', ['rex'], 'easy')
  expect(
    campaign.investigators[0]!.deck.filter((c) => playerCardDef(c)?.weakness === 'basicweakness'),
  ).toHaveLength(1)
  expect(startScenario(campaign, 3, false).investigators[0]!.id).toBe('02002')
  expect(purchaseOptions(campaign, '02002').some((c) => ['02008', '02009'].includes(c.code))).toBe(
    false,
  )
})
it('prohibits Fortune and limits the other classes to five level-zero cards', () => {
  expect(cardPool('02002').some((c) => c.traits.includes('Fortune'))).toBe(false)
  const { deck } = deckFromArkhamDb(data, '21596')
  const illegal = { ...deck, cards: [...deck.cards, '01080', '01024'] }
  expect(validateDeck(illegal).problems.some((p) => p.key === 'deck.problem.notAllowed')).toBe(true)
  expect(validateDeck(illegal).problems.some((p) => p.key === 'deck.problem.offClassLimit')).toBe(
    true,
  )
})
