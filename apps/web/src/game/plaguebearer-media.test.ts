import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import { newCampaign, startScenario } from '@lcg/cards'
import { fallbackCards } from './fallbackCards'
import { cardImages, scanLocale } from './cards'
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
    // AVIF RGB cannot carry the CMYK printing profile from the source JPEG:
    // browsers reject that combination and GameCard falls back to English.
    for (const profileType of ['prof', 'rICC']) {
      const profile = bytes.indexOf(Buffer.from(`colr${profileType}`))
      if (profile >= 0)
        expect(bytes.subarray(profile + 24, profile + 28).toString(), path).toBe('RGB ')
    }
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(card.sha256)
    expect(card.sourceSha256).toMatch(/^[a-f0-9]{64}$/)
    if (/^7800[2-7]b?$/.test(card.code)) expect(card.width).toBeGreaterThan(card.height)
  }
})

it('empareja las caras españolas de los lugares con su estado revelado', () => {
  for (let n = 8; n <= 15; n++) {
    const code = `78${String(n).padStart(3, '0')}`
    const original = String(n).padStart(3, '0')
    expect(media.find((c) => c.language === 'es' && c.code === code)?.source).toMatch(
      new RegExp(`${original}b\\.jpg$`),
    )
    expect(media.find((c) => c.language === 'es' && c.code === `${code}b`)?.source).toMatch(
      new RegExp(`${original}a\\.jpg$`),
    )
    expect(cardImages(code, false, 'es')[0]).toBe(`/local-assets/cards/es/${code}.avif`)
    expect(cardImages(code, true, 'es')[0]).toBe(`/local-assets/cards/es/${code}b.avif`)
  }
})

it('prioriza los originales españoles al usar el idioma activo de la mesa', () => {
  const previous = scanLocale.value
  try {
    scanLocale.value = 'es'
    expect(cardImages('78008')[0]).toBe('/local-assets/cards/es/78008.avif')
    expect(cardImages('78008', true)[0]).toBe('/local-assets/cards/es/78008b.avif')
    scanLocale.value = 'en'
    expect(cardImages('78008')[0]).toBe('/local-assets/cards/en/78008.avif')
  } finally {
    scanLocale.value = previous
  }
})

it('muestra el apoyo del Maletín por delante y su historia por detrás en inglés', () => {
  expect(media.find((c) => c.language === 'en' && c.code === '78017')?.source).toMatch(/-2\.png$/)
  expect(media.find((c) => c.language === 'en' && c.code === '78017b')?.source).toMatch(/-1\.png$/)
})

it.each(['en', 'es'])('presenta el texto de ambas caras de la Morgue en %s', (locale) => {
  const morgue = fallbackCards(locale).find((c) => c.code === '78008')!
  expect(morgue.text).toBe('')
  expect(morgue.back_text).toBe('')
  expect(morgue.flavor).toContain(locale === 'es' ? 'formaldehído' : 'formaldehyde')
  expect(morgue.back_flavor).toContain(locale === 'es' ? 'hasta aquí' : 'here')
})
