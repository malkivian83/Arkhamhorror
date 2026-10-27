// RR: Deckbuilding, Signature cards, Campaign Play.
import { describe, expect, it } from 'vitest'
import { isImplemented, newCampaign, purchaseOptions } from '../campaign'
import { cardPool, starterDeckList, validateDeck } from '../decks'
import { MATEO } from './testing'

describe('Father Mateo: deckbuilding and campaign', () => {
  const starter = () => starterDeckList('mateo', 'mateo', 'Mateo')

  it('ships a valid 30-card starter deck with his signatures', () => {
    const deck = starter()
    expect(validateDeck(deck)).toMatchObject({ problems: [], size: 30 })
    for (const code of new Set([MATEO, ...deck.cards])) expect(isImplemented(code), code).toBe(true)
  })

  it('allows Blessed cards of any class up to level 3', () => {
    const deck = starter()
    const swap = (code: string) => {
      const cards = [...deck.cards]
      cards.splice(cards.indexOf('01086'), 1, code)
      return validateDeck({ ...deck, cards }, false).problems.map((p) => p.key)
    }
    expect(swap('04193')).toEqual([]) // Custom Ammunition (Guardián, Bendecida, 3)
    expect(swap('12016')).toContain('deck.problem.notAllowed') // Guardián sin Bendecido
    expect(cardPool(MATEO).map((c) => c.code)).toContain('04193')
  })

  it('can spend his bonus experience before the first scenario', () => {
    const c = newCampaign('night-of-the-zealot', ['mateo'], 'standard')
    const options = purchaseOptions(c, MATEO).map((o) => o.code)
    expect(options).toContain('04193')
    expect(options).not.toContain('04013')
  })
})
