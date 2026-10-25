// RR: Deckbuilding, Signature cards, Campaign Play.
import { playerCardDef } from '@lcg/engine'
import { choose, labels } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { isImplemented, newCampaign, purchaseOptions, startScenario } from '../campaign'
import { starterDeckList, validateDeck } from '../decks'
import { LOLA } from './testing'

describe('Lola Hayes: deckbuilding and campaign', () => {
  const starter = () => starterDeckList('lola', 'lola', 'Lola')

  it('ships a valid 35-card starter deck with both copies of each signature', () => {
    const deck = starter()
    expect(validateDeck(deck)).toMatchObject({ problems: [], size: 35 })
    for (const code of new Set([LOLA, ...deck.cards])) expect(isImplemented(code), code).toBe(true)
  })

  it('needs at least 7 cards from each of 3 classes', () => {
    const deck = starter()
    // Sin dos cartas de Superviviente solo quedan dos clases con 7 o más.
    const cards = [...deck.cards]
    for (const code of ['12073', '12074']) cards.splice(cards.indexOf(code), 1)
    cards.push('12086', '12088')
    const problems = validateDeck({ ...deck, cards }).problems.map((p) => p.key)
    expect(problems).toContain('deck.problem.classMinimum')
  })

  it('requires two copies of Improvisation and of Crisis of Identity', () => {
    const deck = starter()
    const cards = [...deck.cards]
    cards.splice(cards.indexOf('03019'), 1)
    expect(validateDeck({ ...deck, cards }).problems.map((p) => p.key)).toContain(
      'deck.problem.missingSignature',
    )
  })

  it('allows level 0–3 class cards and never offers her signatures as upgrades', () => {
    const c = newCampaign('the-path-to-carcosa', ['lola'], 'standard')
    c.log.investigators[LOLA]!.xp = 5
    const options = purchaseOptions(c, LOLA).map((o) => o.code)
    expect(options).not.toContain('03018')
    expect(options.every((code) => (playerCardDef(code)?.xp ?? 0) <= 5)).toBe(true)
  })

  it('in Curtain Call, Lola reads her prologue and starts Backstage', () => {
    const c = newCampaign('the-path-to-carcosa', ['lola', 'daniela'], 'standard')
    let s = startScenario(c, 3, false)
    for (let n = 0; n < 20 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++)
      s = choose(s, labels(s)[0]!)
    const at = (id: string) => s.investigators.find((i) => i.id === id)!.location
    expect(at(LOLA)).toBe('03052')
    expect(at(s.investigators.find((i) => i.id !== LOLA)!.id)).toBe('03049')
  })
})
