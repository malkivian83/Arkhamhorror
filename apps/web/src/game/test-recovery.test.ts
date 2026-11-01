import { expect, it } from 'vitest'
import { allPlayerCardDefs, playerCardBehavior } from '@lcg/engine'
import {
  newCampaign,
  purchase,
  purchaseOptions,
  startScenario,
  isStandard,
  validateDeck,
} from '@lcg/cards'
import { fallbackCards } from './fallbackCards'
import { cardImages } from './cards'
import data from '../../../../packages/cards/src/data/test-recovery.json'
import en from '../../../../packages/cards/src/test-recovery/source-en.json'
import es from '../../../../packages/cards/src/test-recovery/source-es.json'
const investigators: Record<string, string> = {
  neutral: 'daniela',
  guardian: 'daniela',
  seeker: 'joe',
  rogue: 'jenny',
  mystic: 'dexter',
  survivor: 'isabelle',
}
it.each(data)(
  '$code is unique, purchasable, playable and presented with official EN/ES text',
  (card) => {
    expect(allPlayerCardDefs().filter((c) => c.code === card.code)).toHaveLength(1)
    expect(playerCardBehavior(card.code)).toBeDefined()
    let c = newCampaign('brethren-of-ash', [investigators[card.class]!], 'easy')
    const id = c.investigators[0]!.id,
      research = playerCardBehavior(card.code)?.requiredResearch
    c.log.investigators[id]!.xp = 30
    if (research) {
      c.log.notes.push(research)
      c.log.values[research] = '5'
      const deck = c.investigators[0]!.deck
      deck[deck.findIndex(isStandard)] = '04022'
    }
    expect(purchaseOptions(c, id).filter((o) => o.code === card.code)).toHaveLength(1)
    c = research
      ? purchase(c, id, card.code, { upgrade: true, replaces: '04022' })
      : purchase(c, id, card.code, { remove: c.investigators[0]!.deck.find(isStandard)! })
    const i = startScenario(c, 3, false).investigators[0]!
    expect([...i.hand, ...i.deck, ...i.discard]).toContain(card.code)
    for (const lang of ['en', 'es'] as const) {
      const source = (lang === 'en' ? en : es).find((c) => c.code === card.code)!,
        shown = fallbackCards(lang).filter((c) => c.code === card.code)
      expect(shown).toHaveLength(1)
      expect(shown[0]).toMatchObject({
        name: source.name,
        text: source.text,
        traits: source.traits,
      })
      expect(cardImages(card.code, false, lang)[0]).toBe(
        `/local-assets/cards/${lang}/${card.code}.avif`,
      )
    }
  },
)
it.each(
  data.flatMap((card) =>
    ('classes' in card ? card.classes : []).map((faction) => ({ code: card.code, faction })),
  ),
)('$code is available to its $faction faction', ({ code, faction }) => {
  const c = newCampaign('brethren-of-ash', [investigators[faction]!], 'easy'),
    id = c.investigators[0]!.id
  c.log.investigators[id]!.xp = 30
  expect(purchaseOptions(c, id).some((o) => o.code === code)).toBe(true)
})
it('Precious Memento permits one of each subtitle while rejecting two of either version', () => {
  let c = newCampaign('brethren-of-ash', ['jenny'], 'easy')
  const id = c.investigators[0]!.id
  c.log.investigators[id]!.xp = 30
  for (const code of ['08114', '08115']) {
    c = purchase(c, id, code, { remove: c.investigators[0]!.deck.find(isStandard)! })
    expect(purchaseOptions(c, id).some((o) => o.code === code)).toBe(false)
  }
  const member = c.investigators[0]!,
    deck = { id: 'memento', name: 'Memento', investigator: id, cards: member.deck }
  expect(
    validateDeck(deck, false).problems.some((p) => p.key === 'deck.problem.tooManyCopies'),
  ).toBe(false)
  expect(
    validateDeck({ ...deck, cards: [...deck.cards, '08114'] }, false).problems.some(
      (p) => p.key === 'deck.problem.tooManyCopies',
    ),
  ).toBe(true)
})
it.each(['04230', '04231', '53004'])(
  '%s requires identification and a lower Ancient Stone to upgrade',
  (code) => {
    const c = newCampaign('brethren-of-ash', ['joe'], 'easy'),
      id = c.investigators[0]!.id
    c.log.investigators[id]!.xp = 30
    expect(purchaseOptions(c, id).some((o) => o.code === code)).toBe(false)
    c.log.notes.push('identifiedStone')
    expect(purchaseOptions(c, id).some((o) => o.code === code)).toBe(false)
    c.investigators[0]!.deck[0] = '04022'
    expect(purchaseOptions(c, id).some((o) => o.code === code && o.replaces === '04022')).toBe(true)
  },
)
