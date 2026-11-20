// Original core investigators (RR Investigator Setup): the cards can be bought and registered; reviewed
// rules are enabled; every card keeps its official EN/ES presentation and scans.
import { expect, it } from 'vitest'
import { allPlayerCardDefs } from '@lcg/engine'
import { fallbackCards } from './fallbackCards'
import { cardImages } from './cards'
import bonded from '../../../../packages/cards/src/data/original-core-investigators.json'
import bondedEn from '../../../../packages/cards/src/original-core-investigators/source-en.json'
import bondedEs from '../../../../packages/cards/src/original-core-investigators/source-es.json'

it.each(bonded)('$code has its official EN/ES presentation and scans', (card) => {
  expect(allPlayerCardDefs().filter((c) => c.code === card.code)).toHaveLength(1)
  for (const lang of ['en', 'es'] as const) {
    const source = (lang === 'en' ? bondedEn : bondedEs).find((c) => c.code === card.code)!
    const shown = fallbackCards(lang).filter((c) => c.code === card.code)
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
})
