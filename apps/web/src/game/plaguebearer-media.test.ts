import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import { newCampaign, startScenario } from '@lcg/cards'
import { fallbackCards } from './fallbackCards'
import { cardImages } from './cards'
import { chaosHelp } from './chaosHelp'
import { localeData } from './localeData'
import { campaignCover } from './campaignProgress'
import cover from '../../../../docs-proyecto/evidencias/plaguebearer-portada.json'
import media from '../../../../packages/cards/src/call-of-the-plaguebearer/media.json'

it('publica la portada original de la guía en la ruta del selector', () => {
  expect(campaignCover('call-of-the-plaguebearer')).toBe(cover.path)
  const bytes = readFileSync(fileURLToPath(new URL(`../../public${cover.path}`, import.meta.url)))
  expect(bytes.subarray(0, 2)).toEqual(Buffer.from([255, 216]))
  expect(bytes.length).toBe(cover.bytes)
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(cover.sha256)
  expect([cover.width, cover.height]).toEqual([448, 560])
})

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
