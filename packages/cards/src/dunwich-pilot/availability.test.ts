import { playerCardDef, registerPlayerCards } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { cardPool, deckFromArkhamDb, isStandard, starterDeckList, validateDeck } from '../decks'
import './index'

const pending = '29999'
registerPlayerCards([
  { code: pending, name: 'Pending test asset', type: 'asset', class: 'guardian', traits: [] },
])
const base = () => starterDeckList('daniela', 'd', 'D')

describe('pilot availability and lossless deck import', () => {
  it.each([
    ['02016', 'daniela'],
    ['02017', 'daniela'],
    ['02018', 'daniela'],
    ['02021', 'joe'],
    ['02022', 'joe'],
    ['02023', 'joe'],
    ['02024', 'trish'],
    ['02025', 'trish'],
    ['02026', 'trish'],
    ['02028', 'dexter'],
    ['02029', 'dexter'],
    ['02032', 'daniela'],
    ['02034', 'daniela'],
    ['02036', 'joe'],
    ['02107', 'joe'],
    ['02111', 'dexter'],
    ['02113', 'daniela'],
    ['02020', 'joe'],
    ['02030', 'dexter'],
    ['02033', 'daniela'],
    ['02105', 'daniela'],
    ['02109', 'trish'],
    ['02116', 'joe'],
    ['02117', 'joe'],
  ])('starts a real scenario with approved card %s in %s’s valid deck', (code, investigator) => {
    const deck = starterDeckList(investigator, 'integration', 'Pilot deck')
    const replace = deck.cards.findIndex(isStandard)
    deck.cards.splice(replace, 1, code)
    expect(validateDeck(deck).problems).toEqual([])
    const campaign = newCampaign(
      'brethren-of-ash',
      [{ investigator: deck.investigator, cards: deck.cards }],
      'easy',
    )
    const game = startScenario(campaign, 3, false)
    const player = game.investigators[0]!
    expect([...player.deck, ...player.hand, ...player.discard]).toContain(code)
    expect(JSON.parse(JSON.stringify(game)).investigators[0].id).toBe(deck.investigator)
  })
  it('preserves every unknown code and quantity and blocks the resulting deck', () => {
    const { deck, unknown } = deckFromArkhamDb(
      { name: 'Imported', investigator_code: '12001', slots: { '12020': 2, '02019': 3 } },
      'id',
    )
    expect(deck.cards).toHaveLength(5)
    expect(deck.cards.filter((code) => code === '02019')).toHaveLength(3)
    expect(unknown).toEqual(['02019'])
    expect(validateDeck(deck).problems).toContainEqual({
      key: 'deck.problem.unknownCard',
      params: { card: '02019' },
    })
  })
  it('also preserves a future investigator without pretending the deck is playable', () => {
    const { deck, unknown } = deckFromArkhamDb(
      { name: 'Future', investigator_code: '01001', slots: { '02019': 2 } },
      'id',
    )
    expect(deck).toMatchObject({ investigator: '01001', cards: ['02019', '02019'] })
    expect(unknown).toEqual(['01001', '02019'])
    expect(validateDeck(deck).problems).toContainEqual({ key: 'deck.problem.unknownInvestigator' })
  })
  it.each([-1, 0.5, Infinity, 1001])('rejects invalid quantities: %s', (count) => {
    expect(() =>
      deckFromArkhamDb(
        { name: 'Bad', investigator_code: '12001', slots: { '12020': count } },
        'id',
      ),
    ).toThrow()
  })
  it('blocks defined cards without a behavior, including bypassing the setup screen', () => {
    const deck = { ...base(), cards: [...base().cards, pending] }
    expect(validateDeck(deck).problems).toContainEqual({
      key: 'deck.problem.unimplemented',
      params: { card: 'Pending test asset' },
    })
    expect(cardPool('12001').some((card) => card.code === pending)).toBe(false)
    expect(() =>
      newCampaign('brethren-of-ash', [{ investigator: '12001', cards: deck.cards }], 'easy'),
    ).toThrow('no disponibles')
    const saved = newCampaign('brethren-of-ash', ['daniela'], 'easy')
    saved.investigators[0]!.deck.push(pending)
    expect(() => startScenario(saved, 1)).toThrow('no disponibles')
  })
  it('offers approved cards and counts reprinted titles together', () => {
    expect(cardPool('12001').some((card) => card.code === '02116')).toBe(true)
    expect(cardPool('12004').some((card) => card.code === '02020')).toBe(true)
    const joe = starterDeckList('joe', 'j', 'J')
    expect(playerCardDef('12032')!.name).toBe(playerCardDef('02020')!.name)
    const deck = { ...joe, cards: [...joe.cards, '02020', '02020'] }
    expect(validateDeck(deck).problems.some((p) => p.key === 'deck.problem.tooManyCopies')).toBe(
      true,
    )
  })
  it('includes approved level-zero additions in campaign purchases', () => {
    const campaign = newCampaign('brethren-of-ash', ['daniela'], 'easy')
    campaign.log.investigators['12001']!.xp = 2
    expect(purchaseOptions(campaign, '12001').some((card) => card.code === '02116')).toBe(true)
    const updated = purchase(campaign, '12001', '02116', { remove: '12020' })
    expect(updated.investigators[0]!.deck).toContain('02116')
    expect(updated.log.investigators['12001']!.xp).toBe(1)
  })
})
