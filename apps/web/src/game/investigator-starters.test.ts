import { describe, expect, it } from 'vitest'
import { fallbackCards } from './fallbackCards'
import { cardImages, cardThumbnail } from './cards'
import natEn from '../../../../packages/cards/src/nathaniel-cho/source-en.json'
import natEs from '../../../../packages/cards/src/nathaniel-cho/source-es.json'
import harEn from '../../../../packages/cards/src/harvey-walters/source-en.json'
import harEs from '../../../../packages/cards/src/harvey-walters/source-es.json'

const sources = { en: [...natEn, ...harEn], es: [...natEs, ...harEs] }
describe.each(['en', 'es'] as const)('investigator starter presentation: %s', (language) => {
  it('presents all 65 codes once with official names, traits, texts and distinct subtitles offline', () => {
    const fallback = fallbackCards(language)
    for (const original of sources[language]) {
      const cards = fallback.filter((card) => card.code === original.code)
      expect(cards, original.code).toHaveLength(1)
      const card = cards[0]!
      expect(card.name).toBe(original.name)
      expect(card.text).toBe(original.text)
      expect(card.traits).toBe(original.traits)
      expect(card.type_code).toBe(original.type_code)
      if ('subname' in original) expect(card.subname).toBe(original.subname)
      if ('back_text' in original) expect(card.back_text).toBe(original.back_text)
      expect(card.text).not.toContain('undefined')
      expect(cardImages(original.code, false, language)[0]).toBe(
        `/local-assets/cards/${language}/${original.code}.avif`,
      )
      expect(cardThumbnail(cardImages(original.code, false, language)[0]!)).toBe(
        `/local-assets/cards/${language}/thumbs/${original.code}.webp`,
      )
    }
    const dark = fallback.find((card) => card.code === '60229')!
    const secrets = fallback.find((card) => card.code === '60230')!
    expect(dark.name).toBe(secrets.name)
    expect(dark.subname).not.toBe(secrets.subname)
    expect(dark.text).not.toBe(secrets.text)
  })

  it('retains both investigator backs in the requested language', () => {
    for (const code of ['60101', '60201'])
      expect(cardImages(code, true, language)[0]).toBe(
        `/local-assets/cards/${language}/${code}b.avif`,
      )
  })
})
