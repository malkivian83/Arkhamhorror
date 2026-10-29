// Batch integration through the public application registry.
import { expect, it } from 'vitest'
import { allPlayerCardDefs, playerCardBehavior } from '@lcg/engine'
import { isStandard, newCampaign, purchase, purchaseOptions, startScenario } from '@lcg/cards'
import data from '../../../../packages/cards/src/data/grouped-import.json'
import { fallbackCards } from './fallbackCards'
import { cardImages, cardThumbnail } from './cards'

const investigators: Record<string, string> = {
  guardian: 'daniela',
  seeker: 'joe',
  rogue: 'jenny',
  survivor: 'isabelle',
}

it.each(data)(
  '$code has one definition, localized presentation, shop entry and legal start',
  (card) => {
    expect(allPlayerCardDefs().filter((c) => c.code === card.code)).toHaveLength(1)
    expect(playerCardBehavior(card.code)).toBeDefined()
    for (const locale of ['en', 'es']) {
      const matches = fallbackCards(locale).filter((c) => c.code === card.code)
      expect(matches).toHaveLength(1)
      expect(matches[0]!.name).toBeTruthy()
      expect(matches[0]!.text).not.toContain('todavía')
      expect(matches[0]!.text).toBeTruthy()
      expect(matches[0]!.xp).toBe(card.xp)
      if (card.type === 'skill') expect(matches[0]!.cost).toBeUndefined()
      expect(cardImages(card.code, false, locale)[0]).toBe(
        `/local-assets/cards/${locale}/${card.code}.avif`,
      )
      expect(cardThumbnail(cardImages(card.code, false, locale)[0]!)).toBe(
        `/local-assets/cards/${locale}/thumbs/${card.code}.webp`,
      )
    }
    let campaign = newCampaign('brethren-of-ash', [investigators[card.class]!], 'easy')
    const member = campaign.investigators[0]!
    campaign.log.investigators[member.id]!.xp = 20
    const options = purchaseOptions(campaign, member.id).filter((o) => o.code === card.code)
    expect(options.filter((o) => !o.replaces)).toHaveLength(1)
    expect(new Set(options.map((o) => o.replaces ?? 'new')).size).toBe(options.length)
    campaign = purchase(campaign, member.id, card.code, { remove: member.deck.find(isStandard)! })
    const started = startScenario(campaign, 3, false).investigators[0]!
    expect([...started.hand, ...started.deck, ...started.discard]).toContain(card.code)
  },
)

it('uses the updated official Spanish name for Timely Intervention', () => {
  const card = fallbackCards('es').find((c) => c.code === '60582')!
  expect(card.name).toBe('Intervención oportuna')
  expect(card.text).toContain('después de revelar')
})
