// RR: Deckbuilding, Signature cards, Campaign Play.
import { playerCardDef } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { isImplemented, newCampaign, purchaseOptions } from '../campaign'
import { starterDeckList, validateDeck } from '../decks'
import { ANDRE } from './testing'

describe('André Patel: deckbuilding and campaign', () => {
  const starter = () => starterDeckList('andre', 'andre', 'André')

  it('ships a valid 30-card starter deck with his four signatures', () => {
    const deck = starter()
    expect(validateDeck(deck)).toMatchObject({ problems: [], size: 30 })
    for (const code of ['60352', '60353', '60354', '60355']) expect(deck.cards).toContain(code)
    for (const code of new Set([ANDRE, ...deck.cards])) expect(isImplemented(code), code).toBe(true)
  })

  it('only allows Rogue and Neutral cards', () => {
    const deck = starter()
    const cards = [...deck.cards]
    cards.splice(cards.indexOf('60363'), 1, '01086')
    expect(validateDeck({ ...deck, cards }).problems).toEqual([])
    cards.splice(cards.indexOf('01086'), 1, '12016')
    expect(validateDeck({ ...deck, cards }).problems.map((p) => p.key)).toContain(
      'deck.problem.notAllowed',
    )
  })

  it('never offers his signatures as purchases and offers Rogue upgrades', () => {
    const c = newCampaign('night-of-the-zealot', ['andre'], 'standard')
    c.log.investigators[ANDRE]!.xp = 5
    const options = purchaseOptions(c, ANDRE).map((o) => o.code)
    expect(options).not.toContain('60352')
    expect(options).toContain('60376')
    expect(options.every((code) => playerCardDef(code)!.class !== 'guardian')).toBe(true)
  })
})
