import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import { newCampaign, startScenario } from '@lcg/cards'
import { fallbackCards } from './fallbackCards'
import { cardImages } from './cards'
import { chaosHelp } from './chaosHelp'
import { localeData } from './localeData'
import media from '../../../../packages/cards/src/call-of-the-plaguebearer/media.json'

it('ofrece Trasnochadores y reserva los siguientes escenarios como pendientes', () => {
  const s = startScenario(newCampaign('call-of-the-plaguebearer', ['joe'], 'standard'), 42, true)
  expect(s.scenarioId).toBe('late-risers')
  expect(s.pending?.question.story?.body).toBe('story.plaguebearer.prologue')
  for (const locale of ['en', 'es'])
    expect(localeData(locale).messages.campaign.names['call-of-the-plaguebearer']).toBeTruthy()
})
it.each(['en', 'es'])('publica cartas y fichas del caos con presentación %s', (locale) => {
  const cards = fallbackCards(locale).filter((c) => c.code.startsWith('78'))
  expect(cards).toHaveLength(28)
  expect(new Set(cards.map((c) => c.code)).size).toBe(cards.length)
  const name = cards.find((c) => c.code === '78251')?.name
  expect(name).toBe(locale === 'es' ? 'Destruyendo pruebas' : 'Jury-Rigged Incendiary')
  expect(cards.find((c) => c.code === '78017')?.text).toContain(
    locale === 'es' ? '3 recursos' : '3 resources',
  )
  const t = (key: string) => key
  expect(
    chaosHelp({ scenarioId: 'late-risers', difficulty: 'hard' }, 'cultist', locale, t),
  ).toContain('−6')
})
it('conserva huellas de las 90 caras, sirve las rutas locales y orienta actos/planes en horizontal', () => {
  expect(media).toHaveLength(90)
  expect(new Set(media.map((c) => `${c.language}:${c.code}`)).size).toBe(media.length)
  for (const card of media) {
    const back = card.code.endsWith('b'),
      code = back ? card.code.slice(0, -1) : card.code
    const path = `/local-assets/cards/${card.language}/${card.code}.avif`
    expect(cardImages(code, back, card.language)).toContain(path)
    const bytes = readFileSync(fileURLToPath(new URL(`../../public${path}`, import.meta.url)))
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(card.sha256)
    expect(card.sourceSha256).toMatch(/^[a-f0-9]{64}$/)
    if (/^7800[2-7]b?$/.test(card.code)) expect(card.width).toBeGreaterThan(card.height)
  }
})
