import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { messages, zealotCards } from '@lcg/i18n'
import { createI18n } from 'vue-i18n'
import { expect, it } from 'vitest'
import { fallbackCards } from './fallbackCards'
import { chaosHelp } from './chaosHelp'
import { cardImages, cardThumbnail } from './cards'

it.each(['en', 'es'] as const)(
  '%s has offline text, both reference faces and matching image files',
  (locale) => {
    const cards = new Map(fallbackCards(locale).map((c) => [c.code, c]))
    for (const [code, text] of Object.entries(zealotCards[locale])) {
      expect(cards.get(code)?.name, code).toBe(text.name)
      expect(cards.get(code)?.text, code).toBe(text.text ?? cards.get(code)?.text)
    }
    expect(cards.get('01117')).toMatchObject({ cost: 0, health: 3, sanity: 3 })
    expect(cards.get('01116')).toMatchObject({
      health: 5,
      health_per_investigator: true,
      enemy_fight: 4,
      enemy_evade: 4,
    })
    const { t } = createI18n({ legacy: false, locale, messages }).global
    for (const difficulty of ['standard', 'hard'] as const) {
      const state = { scenarioId: 'the-gathering', difficulty }
      expect(chaosHelp(state, 'skull', locale, t)).toMatch(difficulty === 'hard' ? /-2/ : /-X/)
      expect(chaosHelp(state, 'tablet', locale, t)).toContain(difficulty === 'hard' ? '-4' : '-2')
    }
    for (const scenarioId of ['the-midnight-masks', 'the-devourer-below'])
      for (const difficulty of ['standard', 'hard'] as const) {
        const value = chaosHelp({ scenarioId, difficulty }, 'tablet', locale, t)
        expect(value).toContain(
          difficulty === 'standard' ? '-3' : scenarioId === 'the-midnight-masks' ? '-4' : '-5',
        )
      }
    for (const code of ['01120', '01142', '01121a', '01121b', '01145b'])
      for (const back of [false, true]) {
        const art = cardImages(code, back, locale)[0]!
        expect(art).toBeDefined()
        expect(existsSync(resolve(import.meta.dirname, '../../public' + art))).toBe(true)
      }
    for (let n = 1104; n <= 1119; n++) {
      const code = String(n).padStart(5, '0')
      for (const back of n <= 1115 ? [false, true] : [false]) {
        const paths = cardImages(code, back, locale)
        expect(paths[0], code).toContain(`/cards/${locale}/`)
        for (const path of [paths[0]!, cardThumbnail(paths[0]!)!])
          expect(existsSync(resolve(import.meta.dirname, '../../public' + path)), path).toBe(true)
      }
    }
  },
)
