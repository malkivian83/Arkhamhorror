import { expect, it } from 'vitest'
import { allPlayerCardDefs, playerCardBehavior, playerCardDef } from '@lcg/engine'
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
import data from '../../../../packages/cards/src/data/conditional-assets.json'
import en from '../../../../packages/cards/src/conditional-assets/source-en.json'
import es from '../../../../packages/cards/src/conditional-assets/source-es.json'
const investigators: Record<string, string> = {
  neutral: 'daniela',
  guardian: 'daniela',
  seeker: 'joe',
  rogue: 'jenny',
  mystic: 'dexter',
  survivor: 'isabelle',
}
it.each(data)('$code is unique, purchasable, playable and presented in EN/ES', (card) => {
  expect(allPlayerCardDefs().filter((c) => c.code === card.code)).toHaveLength(1)
  expect(playerCardBehavior(card.code)).toBeDefined()
  let c = newCampaign('brethren-of-ash', [investigators[card.class]!], 'easy')
  const id = c.investigators[0]!.id
  c.log.investigators[id]!.xp = 40
  if (card.code === '10127')
    c.investigators[0]!.deck = c.investigators[0]!.deck.map((code) =>
      code === '02234' ? '11096' : code,
    )
  const offer = purchaseOptions(c, id).find((o) => o.code === card.code && !o.replaces)!
  expect(offer).toBeDefined()
  c = purchase(c, id, card.code, { remove: c.investigators[0]!.deck.find(isStandard)! })
  const s = startScenario(c, 3, false),
    i = s.investigators[0]!
  if (playerCardBehavior(card.code)!.permanent)
    expect(Object.values(s.assets).some((a) => a.code === card.code)).toBe(true)
  else expect([...i.hand, ...i.deck, ...i.discard]).toContain(card.code)
  for (const lang of ['en', 'es'] as const) {
    const source = (lang === 'en' ? en : es).find((c) => c.code === card.code)!,
      shown = fallbackCards(lang).filter((c) => c.code === card.code)
    expect(shown).toHaveLength(1)
    expect(shown[0]).toMatchObject({ name: source.name, text: source.text, traits: source.traits })
    expect(cardImages(card.code, false, lang)[0]).toBe(
      `/local-assets/cards/${lang}/${card.code}.avif`,
    )
  }
})
it.each(['06026', '06323', '11090', '11096'])(
  '%s grants two same-level Myriad copies for no XP and respects the three-copy limit',
  (code) => {
    const def = playerCardDef(code)!
    let c = newCampaign('brethren-of-ash', [investigators[def.class ?? 'neutral']!], 'easy')
    const id = c.investigators[0]!.id
    c.log.investigators[id]!.xp = 20
    for (let n = 0; n < 3; n++) {
      const offers = purchaseOptions(c, id).filter((o) => o.code === code),
        o = offers.find((o) => !o.replaces) ?? offers[0]!
      expect(o.cost).toBe(n === 0 ? Math.max(1, def.xp ?? 0) : 0)
      c = purchase(
        c,
        id,
        code,
        o.replaces
          ? { upgrade: true, replaces: o.replaces }
          : { remove: c.investigators[0]!.deck.find(isStandard)! },
      )
    }
    expect(c.log.investigators[id]!.xp).toBe(20 - Math.max(1, def.xp ?? 0))
    expect(purchaseOptions(c, id).some((o) => o.code === code)).toBe(false)
    expect(
      validateDeck({
        id: 'myriad',
        name: 'Myriad',
        investigator: id,
        cards: c.investigators[0]!.deck,
      }).problems.some((p) => p.key === 'deck.problem.tooManyCopies'),
    ).toBe(false)
  },
)
it('upgrading one Glimmer grants the other same-level upgrades free', () => {
  let c = newCampaign('brethren-of-ash', ['isabelle'], 'easy')
  const id = c.investigators[0]!.id,
    deck = c.investigators[0]!.deck
  c.log.investigators[id]!.xp = 10
  for (let n = 0; n < 2; n++) {
    const at = deck.findIndex((code) => isStandard(code) && code !== '06245')
    deck[at] = '06245'
  }
  c = purchase(c, id, '11090', { upgrade: true, replaces: '06245' })
  expect(c.log.investigators[id]!.xp).toBe(8)
  expect(
    purchaseOptions(c, id).find((o) => o.code === '11090' && o.replaces === '06245')!.cost,
  ).toBe(0)
  c = purchase(c, id, '11090', { upgrade: true, replaces: '06245' })
  expect(c.log.investigators[id]!.xp).toBe(8)
})
it('Dark Horse 5 upgrades the old asset and opens a slot filled paying normally', () => {
  let c = newCampaign('brethren-of-ash', ['isabelle'], 'easy')
  const id = c.investigators[0]!.id
  c.log.investigators[id]!.xp = 20
  const deck = c.investigators[0]!.deck.map((code) => (code === '02234' ? '11096' : code))
  deck[deck.findIndex(isStandard)] = '02234'
  c.investigators[0]!.deck = deck
  c = purchase(c, id, '10127', { upgrade: true, replaces: '02234' })
  expect(c.log.investigators[id]!.xp).toBe(15)
  expect(c.investigators[0]!.owedFills).toBe(1)
  expect(purchaseOptions(c, id).find((o) => o.code === '11096')!.cost).toBe(1)
})
