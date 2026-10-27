// RR: Deckbuilding, Signature cards, Campaign Play.
import { describe, expect, it } from 'vitest'
import { isImplemented, newCampaign, purchaseOptions } from '../campaign'
import { starterDeckList, validateDeck } from '../decks'
import { MARIE } from './testing'

describe('Marie Lambeau: deckbuilding and campaign', () => {
  const starter = () => starterDeckList('marie', 'marie', 'Marie')
  const replace = (out: string[], add: string[]) => {
    const deck = starter()
    const cards = [...deck.cards]
    for (const code of out) cards.splice(cards.indexOf(code), 1)
    return validateDeck({ ...deck, cards: [...cards, ...add] }, false).problems.map((p) => p.key)
  }

  it('ships a valid 30-card starter deck with her signatures', () => {
    const deck = starter()
    expect(validateDeck(deck)).toMatchObject({ problems: [], size: 30 })
    for (const code of new Set([MARIE, ...deck.cards])) expect(isImplemented(code), code).toBe(true)
  })

  it('allows Spells of any class and Mystic cards up to level 3', () => {
    expect(replace(['02029'], ['53001'])).toEqual([]) // Blood Eclipse (Guardián, Hechizo, 1)
    expect(replace(['02029'], ['01087'])).toEqual([]) // Flashlight (neutral)
    expect(replace(['02029'], ['12016'])).toContain('deck.problem.notAllowed') // Guardián
  })

  it('allows at most five other level 0 Seeker and/or Survivor cards', () => {
    // El mazo inicial ya lleva dos Lucky! (Superviviente).
    expect(replace(['02029', '01059', '06163'], ['01081', '01081', '01074'])).toEqual([])
    expect(
      replace(['02029', '01059', '06163', '02030'], ['01081', '01081', '01074', '01074']),
    ).toContain('deck.problem.offClassLimit')
    expect(replace(['02029'], ['01048'])).toContain('deck.problem.notAllowed') // Rebelde
  })

  it('never offers her signatures as purchases', () => {
    const c = newCampaign('night-of-the-zealot', ['marie'], 'standard')
    c.log.investigators[MARIE]!.xp = 5
    expect(purchaseOptions(c, MARIE).map((o) => o.code)).not.toContain('05018')
  })
})
