import { describe, expect, it } from 'vitest'
import { messages } from '@lcg/i18n'
import { fallbackCards } from './fallbackCards'
import approvals from '../../../../packages/cards/src/marie-lambeau-2025/approvals.json'
import marEn from '../../../../packages/cards/src/marie-lambeau-2025/source-en.json'
import marEs from '../../../../packages/cards/src/marie-lambeau-2025/source-es.json'

const codes = new Set(approvals.cards.map((c) => c.code))
const sources = { en: marEn, es: marEs }
describe.each(['en', 'es'] as const)('Marie Lambeau starter deck presentation: %s', (language) => {
  it('presents the new codes once with official names, traits, texts and backs offline', () => {
    const fallback = fallbackCards(language)
    for (const original of sources[language].filter((c) => codes.has(c.code))) {
      const cards = fallback.filter((card) => card.code === original.code)
      expect(cards, original.code).toHaveLength(1)
      const card = cards[0]!
      expect(card.name).toBe(original.name)
      expect(card.text).toBe(original.text)
      expect(card.traits).toBe(original.traits)
      if ('subname' in original) expect(card.subname).toBe(original.subname)
      if ('back_text' in original) expect(card.back_text).toBe(original.back_text)
    }
  })

  it('names the edition of both Marie Lambeau investigators', () => {
    const editions = messages[language].investigator.editions as Record<string, string>
    expect(editions['05006']).toBeTruthy()
    expect(editions['60451']).toBeTruthy()
    expect(editions['05006']).not.toBe(editions['60451'])
  })
})
