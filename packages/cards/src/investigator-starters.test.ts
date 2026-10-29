// RR: Deckbuilding, Signature Cards, Campaign Play. Official investigator starter decks.
import { allPlayerCardDefs, playerCardDef } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { isImplemented, newCampaign, purchaseOptions, startScenario } from './campaign'
import { deckFromArkhamDb, starterDeckList, validateDeck } from './decks'
import nathaniel from './nathaniel-cho/source-en.json'
import harvey from './harvey-walters/source-en.json'
import nathanielDeck from './nathaniel-cho/starter-deck.json'
import harveyDeck from './harvey-walters/starter-deck.json'

const packs = [
  {
    key: 'nathaniel',
    decklist: nathanielDeck,
    code: '60101',
    source: nathaniel,
    first: 60105,
    signatures: ['60102', '60103'],
    basic: '60104',
    opposite: '60214',
    foreignSignature: '60202',
    upgrade: '60127',
    class: 'guardian',
  },
  {
    key: 'harvey',
    decklist: harveyDeck,
    code: '60201',
    source: harvey,
    first: 60205,
    signatures: ['60202', '60203'],
    basic: '60204',
    opposite: '60111',
    foreignSignature: '60102',
    upgrade: '60233',
    class: 'seeker',
  },
]

describe.each(packs)('$key: complete investigator starter pack', (pack) => {
  const starter = () => starterDeckList(pack.key, pack.key, pack.source[0]!.name)

  it('provides the official 30-card deck, both signatures and its basic weakness', () => {
    const deck = starter()
    expect(deck.investigator).toBe(pack.code)
    expect(validateDeck(deck)).toMatchObject({ size: 30, problems: [] })
    expect(deck.cards).toHaveLength(33)
    for (const code of [...pack.signatures, pack.basic])
      expect(deck.cards.filter((c) => c === code)).toHaveLength(1)
    for (let n = 0; n < 15; n++)
      expect(deck.cards.filter((c) => c === String(pack.first + n))).toHaveLength(2)
    for (const card of pack.source) {
      expect(isImplemented(card.code), card.code).toBe(true)
      expect(
        allPlayerCardDefs().filter((d) => d.code === card.code),
        card.code,
      ).toHaveLength(1)
    }
  })

  it('imports the same exact codes from ArkhamDB and starts a campaign scenario', () => {
    const deck = starter()
    const imported = deckFromArkhamDb(pack.decklist, pack.key)
    expect(imported.unknown).toEqual([])
    expect(imported.deck.cards.toSorted()).toEqual(deck.cards.toSorted())
    expect(validateDeck(imported.deck)).toMatchObject({ size: 30, problems: [] })
    const campaign = newCampaign(
      'night-of-the-zealot',
      [{ investigator: pack.code, cards: imported.deck.cards }],
      'standard',
      3,
    )
    expect(
      campaign.investigators[0]!.deck.filter((c) => playerCardDef(c)?.weakness === 'basicweakness'),
    ).toEqual([pack.basic])
    const game = startScenario(campaign, 3, false)
    expect(game.investigators[0]!.id).toBe(pack.code)
    expect(game.investigators[0]!.name).toBe(pack.source[0]!.name)
  })

  it('rejects off-class cards and foreign signatures, and detects missing signatures', () => {
    const deck = starter()
    const cards = [...deck.cards]
    cards.splice(cards.indexOf(String(pack.first)), 1, pack.opposite)
    expect(validateDeck({ ...deck, cards }).problems.map((p) => p.key)).toContain(
      'deck.problem.notAllowed',
    )
    cards.splice(cards.indexOf(pack.opposite), 1, pack.foreignSignature)
    expect(validateDeck({ ...deck, cards }).problems.map((p) => p.key)).toContain(
      'deck.problem.otherSignature',
    )
    expect(
      validateDeck({
        ...deck,
        cards: deck.cards.filter((c) => c !== pack.signatures[0]),
      }).problems.map((p) => p.key),
    ).toContain('deck.problem.missingSignature')
  })

  it('offers standard upgrades once and excludes all signatures from campaign purchases', () => {
    const campaign = newCampaign('night-of-the-zealot', [pack.key], 'standard')
    campaign.log.investigators[pack.code]!.xp = 20
    const options = purchaseOptions(campaign, pack.code)
    const codes = options.map((o) => o.code)
    expect(codes).toContain(pack.upgrade)
    expect(new Set(codes).size).toBe(codes.length)
    for (const code of [...pack.signatures, pack.foreignSignature])
      expect(codes).not.toContain(code)
    expect(
      options.every((o) => [pack.class, 'neutral'].includes(playerCardDef(o.code)!.class)),
    ).toBe(true)
  })
})
