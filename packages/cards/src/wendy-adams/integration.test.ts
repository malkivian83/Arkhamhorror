// RR: Deckbuilding, Signature cards, Campaign Play.
import { playerCardDef } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { isImplemented, newCampaign, purchaseOptions } from '../campaign'
import { starterDeckList, validateDeck } from '../decks'
import { WENDY } from './testing'

describe('Wendy Adams: deckbuilding and campaign', () => {
  const starter = () => starterDeckList('wendy', 'wendy', 'Wendy')

  it('ships a valid 30-card starter deck with her signatures', () => {
    const deck = starter()
    expect(validateDeck(deck)).toMatchObject({ problems: [], size: 30 })
    for (const code of new Set([WENDY, ...deck.cards])) expect(isImplemented(code), code).toBe(true)
  })

  it('allows Rogue cards up to level 2 only', () => {
    const deck = starter()
    const swap = (code: string) => {
      const cards = [...deck.cards]
      cards.splice(cards.indexOf('01044'), 1, code)
      return validateDeck({ ...deck, cards }, false).problems.map((p) => p.key)
    }
    expect(swap('02152')).toEqual([]) // Switchblade (2)
    expect(swap('01057')).toContain('deck.problem.notAllowed') // Hot Streak (4)
    expect(swap('12016')).toContain('deck.problem.notAllowed') // Guardián
  })

  it('offers Survivor upgrades and never her signatures', () => {
    const c = newCampaign('night-of-the-zealot', ['wendy'], 'standard')
    c.log.investigators[WENDY]!.xp = 5
    const options = purchaseOptions(c, WENDY).map((o) => o.code)
    expect(options).not.toContain('01014')
    expect(
      options.every((code) => {
        const def = playerCardDef(code)!
        return def.class !== 'rogue' || (def.xp ?? 0) <= 2
      }),
    ).toBe(true)
  })
})
