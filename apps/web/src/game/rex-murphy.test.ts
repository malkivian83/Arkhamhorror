import { expect, it } from 'vitest'
import { fallbackCards } from './fallbackCards'
import { cardImages, cardThumbnail } from './cards'
import en from '../../../../packages/cards/src/rex-murphy/source-en.json'
import es from '../../../../packages/cards/src/rex-murphy/source-es.json'
it.each(['en', 'es'] as const)('presents the complete Rex batch in %s', (lang) => {
  for (const original of lang === 'en' ? en : es) {
    const cards = fallbackCards(lang).filter((c) => c.code === original.code)
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({
      name: original.name,
      text: original.text,
      traits: original.traits,
    })
    expect(cardImages(original.code, false, lang)[0]).toBe(
      `/local-assets/cards/${lang}/${original.code}.avif`,
    )
    expect(cardThumbnail(cardImages(original.code, false, lang)[0]!)).toBe(
      `/local-assets/cards/${lang}/thumbs/${original.code}.webp`,
    )
  }
})
