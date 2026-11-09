// RR: Deckbuilding, Signature Cards, Campaign Play. Official investigator starter deck.
import { allPlayerCardDefs, playerCardDef } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { isImplemented, newCampaign, purchaseOptions, startScenario } from '../campaign'
import { deckFromArkhamDb, starterDeckList, validateDeck } from '../decks'
import source from './source-en.json'
import decklist from './starter-deck.json'
import { TOMMY_RENDERED_CODES } from './index'

describe('Tommy Muldoon: complete investigator starter pack', () => {
  const starter = () => starterDeckList('tommy', 'tommy', 'Tommy Muldoon')

  it('provides the official 30-card deck, both signatures and its basic weakness', () => {
    const deck = starter()
    expect(deck.investigator).toBe('60151')
    expect(validateDeck(deck)).toMatchObject({ size: 30, problems: [] })
    expect(deck.cards).toHaveLength(33)
    for (const code of ['60152', '60153', '60154'])
      expect(deck.cards.filter((c) => c === code)).toHaveLength(1)
    for (let n = 0; n < 15; n++)
      expect(deck.cards.filter((c) => c === String(60155 + n))).toHaveLength(2)
  })

  it('implements every code of the pack exactly once', () => {
    expect(source.map((c) => c.code)).toEqual(TOMMY_RENDERED_CODES)
    for (const code of TOMMY_RENDERED_CODES) {
      expect(isImplemented(code), code).toBe(true)
      expect(
        allPlayerCardDefs().filter((d) => d.code === code),
        code,
      ).toHaveLength(1)
    }
  })

  it('imports the same exact codes from ArkhamDB and starts a campaign scenario', () => {
    const imported = deckFromArkhamDb(decklist, 'tommy')
    expect(imported.unknown).toEqual([])
    expect(imported.deck.cards.toSorted()).toEqual(starter().cards.toSorted())
    expect(validateDeck(imported.deck)).toMatchObject({ size: 30, problems: [] })
    const campaign = newCampaign(
      'night-of-the-zealot',
      [{ investigator: '60151', cards: imported.deck.cards }],
      'standard',
      3,
    )
    expect(
      campaign.investigators[0]!.deck.filter((c) => playerCardDef(c)?.weakness === 'basicweakness'),
    ).toEqual(['60154'])
    const game = startScenario(campaign, 3, false)
    expect(game.investigators[0]!.id).toBe('60151')
    expect(game.investigators[0]!.name).toBe('Tommy Muldoon')
  })

  it('rejects off-class cards and foreign signatures, and detects missing signatures', () => {
    const deck = starter()
    const cards = [...deck.cards]
    cards.splice(cards.indexOf('60155'), 1, '60214')
    expect(validateDeck({ ...deck, cards }).problems.map((p) => p.key)).toContain(
      'deck.problem.notAllowed',
    )
    cards.splice(cards.indexOf('60214'), 1, '60102')
    expect(validateDeck({ ...deck, cards }).problems.map((p) => p.key)).toContain(
      'deck.problem.otherSignature',
    )
    expect(
      validateDeck({ ...deck, cards: deck.cards.filter((c) => c !== '60152') }).problems.map(
        (p) => p.key,
      ),
    ).toContain('deck.problem.missingSignature')
  })

  it('offers Guardian upgrades once and excludes signatures from campaign purchases', () => {
    const campaign = newCampaign('night-of-the-zealot', ['tommy'], 'standard')
    campaign.log.investigators['60151']!.xp = 20
    const options = purchaseOptions(campaign, '60151')
    const codes = options.map((o) => o.code)
    expect(codes).toContain('60182')
    expect(codes).toContain('60176')
    expect(new Set(codes).size).toBe(codes.length)
    for (const code of ['60152', '60153', '60102']) expect(codes).not.toContain(code)
    expect(
      options.every((o) => {
        const card = playerCardDef(o.code)!
        return (card.classes ?? [card.class]).some((f) => ['guardian', 'neutral'].includes(f))
      }),
    ).toBe(true)
  })
})
