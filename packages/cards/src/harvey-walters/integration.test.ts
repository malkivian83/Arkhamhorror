// RR: Deckbuilding, Campaign Play, Researched, Permanent, Signature cards.
import { allPlayerCardDefs, playerCardDef } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { isImplemented, newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { starterDeckList, validateDeck } from '../decks'
import definitions from '../data/harvey-walters.json'
import source from './source-en.json'
import { H } from './testing'

describe('Harvey starter deck and upgrades', () => {
  it('registers all 33 pack codes and ships a legal 30-card deck with both weaknesses and signatures', () => {
    const deck = starterDeckList('harvey', 'harvey', 'Harvey')
    expect(validateDeck(deck)).toMatchObject({ problems: [], size: 30, unimplemented: [] })
    expect(deck.cards).toEqual(expect.arrayContaining(['60202', '60203', '60204']))
    expect(new Set(source.map((c) => c.code)).size).toBe(33)
    for (const c of source) expect(isImplemented(c.code), c.name).toBe(true)
    expect(new Set(allPlayerCardDefs().map((c) => c.code)).size).toBe(allPlayerCardDefs().length)
    for (const c of definitions) expect(playerCardDef(c.code)).toEqual(c)
  })
  it('starts a campaign with the official deck, without replacing its selected basic weakness', () => {
    const c = newCampaign('night-of-the-zealot', ['harvey'], 'standard', 4)
    expect(
      c.investigators[0]!.deck.filter((code) => playerCardDef(code)?.weakness === 'basicweakness'),
    ).toEqual(['60204'])
    expect(startScenario(c, 4, false).investigators[0]!.id).toBe(H)
  })
  it('only offers Seeker/Neutral cards and never sells another investigator exclusive', () => {
    const c = newCampaign('night-of-the-zealot', ['harvey'], 'standard')
    c.log.investigators[H]!.xp = 20
    const shop = purchaseOptions(c, H).map((o) => o.code)
    expect(shop).not.toContain('60202')
    expect(shop).not.toContain('60102')
    expect(shop).not.toContain('60105')
    expect(shop).toContain('60231')
    const deck = starterDeckList('harvey', 'harvey', 'Harvey')
    const replaced = [...deck.cards]
    replaced[replaced.indexOf('60206')] = '60105'
    expect(validateDeck({ ...deck, cards: replaced }).problems.map((p) => p.key)).toContain(
      'deck.problem.notAllowed',
    )
  })
  it('researched Tomes require the translated note and an untranslated copy to upgrade', () => {
    let c = newCampaign('night-of-the-zealot', ['harvey'], 'standard')
    c.log.investigators[H]!.xp = 10
    expect(purchaseOptions(c, H).filter((o) => ['60229', '60230'].includes(o.code))).toEqual([])
    c.log.notes.push('translatedTheTome')
    const choices = purchaseOptions(c, H).filter((o) => ['60229', '60230'].includes(o.code))
    expect(choices).toHaveLength(2)
    expect(choices.every((o) => o.replaces === '60210' && o.cost === 3)).toBe(true)
    c = purchase(c, H, '60229', { upgrade: true })
    expect(c.investigators[0]!.deck).toContain('60229')
    expect(c.log.investigators[H]!.xp).toBe(7)
    c.investigators[0]!.deck = c.investigators[0]!.deck.filter((code) => code !== '60210')
    expect(purchaseOptions(c, H).filter((o) => ['60229', '60230'].includes(o.code))).toEqual([])
  })
})
