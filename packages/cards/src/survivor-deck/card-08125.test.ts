// RR: Deckbuilding, Permanent, Campaign Play, Trauma; In the Thick of It printed text.
import { playerCardDef } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { cardPool, deckFromArkhamDb, validateDeck } from '../decks'
import { deckSize, newCampaign, purchaseOptions, startScenario } from '../campaign'
import { startingExperience, startingExperienceSpent } from './card-08125'
import data from './decklist-54484.json'
import '../index'

const imported = () => deckFromArkhamDb(data, '54484').deck
const create = (physical = 0, cards = imported().cards) =>
  newCampaign(
    'brethren-of-ash',
    [
      {
        investigator: data.investigator_code,
        cards,
        startingTrauma: { physical, mental: 2 - physical },
      },
    ],
    'standard',
    7,
  )

describe('decklist 54484 and In the Thick of It', () => {
  it('imports thirty deck-size cards, two signatures and two permanents without the random placeholder', () => {
    const { deck, unknown } = deckFromArkhamDb(data, '54484')
    expect(unknown).toEqual([])
    expect(deck.cards).not.toContain('01000')
    expect(deck.cards).toHaveLength(34)
    expect(validateDeck(deck)).toMatchObject({ problems: [], size: 30, needsBasicWeakness: true })
    expect(deckSize(deck.cards)).toBe(30)
    expect(validateDeck({ ...deck, cards: [...deck.cards, '01000'] }).problems).toEqual([])
  })

  it('uses all three initial experience for two Ice Picks and At a Crossroads', () => {
    const deck = imported()
    expect(startingExperience(deck.cards)).toBe(3)
    expect(startingExperienceSpent(deck.cards)).toBe(3)
    expect(
      validateDeck({ ...deck, cards: [...deck.cards, '08105'] }).problems.map((p) => p.key),
    ).toContain('deck.problem.levelAtStart')
    expect(
      validateDeck({ ...deck, cards: deck.cards.filter((c) => c !== '08125') }).problems.map(
        (p) => p.key,
      ),
    ).toContain('deck.problem.levelAtStart')
    expect(cardPool(data.investigator_code).some((c) => c.code === '08105')).toBe(true)
  })

  it.each([0, 1, 2])(
    'persists the chosen split with %i physical trauma and applies it to scenario setup',
    (physical) => {
      const campaign = create(physical, [...imported().cards, '01000'])
      const member = campaign.investigators[0]!
      expect(member.deck).not.toContain('01000')
      expect(member.deck).toHaveLength(35)
      expect(
        member.deck.filter((c) => playerCardDef(c)?.weakness === 'basicweakness'),
      ).toHaveLength(1)
      expect(campaign.log.investigators[member.id]).toMatchObject({
        xp: 0,
        physicalTrauma: physical,
        mentalTrauma: 2 - physical,
      })
      const game = startScenario(campaign, 9, false)
      expect(game.investigators[0]).toMatchObject({ damage: physical, horror: 2 - physical })
      expect(startScenario(campaign, 10, false).campaignLog?.investigators[member.id]).toMatchObject(
        {
          xp: 0,
          physicalTrauma: physical,
          mentalTrauma: 2 - physical,
        },
      )
    },
  )

  it('preserves unspent initial experience and excludes creation-only permanents from later purchases', () => {
    const cards = imported().cards.map((c) => (c === '09109' ? '01091' : c))
    const campaign = create(0, cards)
    expect(campaign.log.investigators[data.investigator_code]!.xp).toBe(1)
    const options = purchaseOptions(campaign, data.investigator_code).map((o) => o.code)
    expect(options).not.toContain('08071')
    expect(options).not.toContain('08125')
  })

  it('requires an explicit valid trauma split instead of silently granting experience', () => {
    expect(() =>
      newCampaign(
        'brethren-of-ash',
        [{ investigator: data.investigator_code, cards: imported().cards }],
        'standard',
      ),
    ).toThrow('requires a choice of two')
    expect(() => create(3)).toThrow('requires a choice of two')
  })
})
