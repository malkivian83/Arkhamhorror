import { describe, expect, it } from 'vitest'
import { cardImages, cardThumbnail } from './cards'
import manifest from './cardImageManifest.json'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { fallbackCards } from './fallbackCards'
import { RENDERED_PLAYER_CARD_CODES } from '@lcg/cards'
import { isPermanent } from '@lcg/engine'

describe('imágenes españolas de referencia y alternativas', () => {
  it('cada original tiene una miniatura local independiente, también las dos caras', () => {
    for (const paths of Object.values(manifest))
      for (const original of Object.values(paths)) {
        const thumbnail = cardThumbnail(original)
        expect(thumbnail).toMatch(/^\/local-assets\/cards\/(en|es)\/thumbs\/\d{5}b?\.webp$/)
        expect(thumbnail).not.toBe(original)
        expect(
          existsSync(fileURLToPath(new URL(`../../public${thumbnail}`, import.meta.url))),
        ).toBe(true)
      }
    expect(cardThumbnail(cardImages('12116', false, 'es')[0]!)).toBe(
      '/local-assets/cards/es/thumbs/12116.webp',
    )
    expect(cardThumbnail('/cards/es/12017.jpg')).toBeNull()
    expect(cardThumbnail('https://example.com/12017.jpg')).toBeNull()
  })
  it('el manifiesto solo contiene archivos presentes que se sirven desde nuestra web', () => {
    for (const paths of Object.values(manifest))
      for (const path of Object.values(paths)) {
        expect(path).toMatch(/^\/local-assets\/cards\/(en|es)\/\d{5}b?\.(avif|jpg)$/)
        expect(existsSync(fileURLToPath(new URL(`../../public${path}`, import.meta.url)))).toBe(
          true,
        )
      }
  })
  it('cubre cada carta con imagen local o presentación renderizada aprobada', () => {
    // El catálogo se calcula una vez por idioma (construirlo por carta es lento).
    const catalogue = Object.fromEntries(
      ['en', 'es'].map((locale) => [
        locale,
        new Map(fallbackCards(locale).map((c) => [c.code, c])),
      ]),
    )
    const codes = new Set(catalogue.en!.keys())
    const rendered = new Set(RENDERED_PLAYER_CARD_CODES)
    for (let n = 1; n <= 62; n++) codes.add(`71${String(n).padStart(3, '0')}`)
    for (const code of codes) {
      if (rendered.has(code)) {
        for (const locale of ['en', 'es']) {
          const card = catalogue[locale]!.get(code)!
          expect(card.name, code).toBeTruthy()
          expect(card.text, code).toBeTruthy()
          if (card.type_code === 'skill' || isPermanent(code))
            expect(card.cost, code).toBeUndefined()
          else expect(card.cost, code).toBeTypeOf('number')
        }
      } else if (/^\d{5}b?$/.test(code))
        expect(cardImages(code, false, 'en').length, code).toBeGreaterThan(0)
    }
  })
  it.each(['10128', '12017'])(
    'prefiere el recurso español disponible de %s y conserva el inglés',
    (code) => {
      expect(cardImages(code, false, 'es')).toEqual([
        `/local-assets/cards/es/${code}.avif`,
        `/local-assets/cards/en/${code}.avif`,
      ])
      expect(cardImages(code, false, 'en')).toEqual([`/local-assets/cards/en/${code}.avif`])
    },
  )
  it('una reimpresión sin imagen propia usa la de otra impresión de la carta', () => {
    for (const reprint of ['01039', '01539', '60219', '60267'])
      expect(cardImages(reprint, false, 'es')).toEqual(cardImages('12039', false, 'es'))
    expect(cardImages('12039', false, 'es').length).toBeGreaterThan(0)
  })
  it('no solicita traducciones ausentes de Gala ni pierde su segunda cara especial', () => {
    expect(cardImages('71008', false, 'es')).toEqual(['/local-assets/cards/en/71008.avif'])
    expect(cardImages('71045b', false, 'es')).toEqual(['/local-assets/cards/en/71045b.avif'])
  })
  it('las imágenes .avif no se invierten: {código} es la cara revelada y {código}b la otra', () => {
    // Patio principal de Miskatonic: revelada con texto, sin revelar solo con la ilustración.
    expect(cardImages('12116', false, 'es')[0]).toBe('/local-assets/cards/es/12116.avif')
    expect(cardImages('12116', true, 'es')[0]).toBe('/local-assets/cards/es/12116b.avif')
    expect(cardImages('12183', true, 'en')[0]).toBe('/local-assets/cards/en/12183b.avif')
    expect(cardImages('12179b', true, 'es')[0]).toContain('/local-assets/cards/es/12179.avif')
    expect(cardImages('invalid', false, 'es')).toEqual([])
  })
})
