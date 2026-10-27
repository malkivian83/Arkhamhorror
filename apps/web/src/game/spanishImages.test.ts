import { describe, expect, it } from 'vitest'
import { cardImages, cardThumbnail } from './cards'
import manifest from './cardImageManifest.json'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { fallbackCards } from './fallbackCards'
import { RENDERED_PLAYER_CARD_CODES } from '@lcg/cards'
import { isPermanent, playerCardBehavior, playerCardDef } from '@lcg/engine'

describe('imágenes españolas de referencia y alternativas', () => {
  it('shows the player back for a dimensional duplicate instead of the Duplicator scan', () => {
    expect(cardImages('fof-dimensional-duplicate', false, 'es')).toEqual([
      '/local-assets/backs/player.jpg',
    ])
    expect(cardImages('fof-dimensional-duplicate', false, 'en')).toEqual([
      '/local-assets/backs/player.jpg',
    ])
  })
  it('represents Abarran’s printed dashes without inventing numerical statistics', () => {
    for (const locale of ['en', 'es']) {
      const card = fallbackCards(locale).find((c) => c.code === '88034a')!
      expect(card.enemy_fight).toBeUndefined()
      expect(card.health).toBeUndefined()
      expect(card.enemy_evade).toBeUndefined()
    }
  })

  it.each([
    '01033',
    '01046',
    '01075',
    '02155',
    '02192',
    '02226',
    '02227',
    '03021',
    '03037',
    '03039',
    '03110',
    '03116',
    '03117',
    '03118',
    '03119',
    '03190',
    '04204',
    '04229',
    '05109',
    '06280',
    '50010',
    '51003',
    '60171',
    '60167',
    '60505',
  ])('muestra la imagen española de %s antes que la alternativa inglesa', (code) => {
    expect(cardImages(code, false, 'es')).toEqual([
      `/local-assets/cards/es/${code}.avif`,
      `/local-assets/cards/en/${code}.avif`,
    ])
    expect(cardImages(code, false, 'en')).toEqual([`/local-assets/cards/en/${code}.avif`])
  })

  it('conserva el idioma real y las dos orientaciones del reverso de Dexter de 2026', () => {
    const back = ['/local-assets/cards/en/12010b.jpg']
    expect(cardImages('12010', true, 'es')).toEqual(back)
    expect(cardImages('12010b', false, 'es')).toEqual(back)
    expect(cardImages('12010', true, 'en')).toEqual(back)
    expect(cardImages('12010b', true, 'es')[0]).toBe('/local-assets/cards/es/12010.avif')
    expect(manifest.es).not.toHaveProperty('12010b')
  })

  it('cada original tiene una miniatura local independiente, también las dos caras', () => {
    for (const paths of Object.values(manifest))
      for (const original of Object.values(paths)) {
        const thumbnail = cardThumbnail(original)
        expect(thumbnail).toMatch(/^\/local-assets\/cards\/(en|es)\/thumbs\/\d{5}[a-f]?b?\.webp$/)
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
        expect(path).toMatch(/^\/local-assets\/cards\/(en|es)\/\d{5}[a-f]?b?\.(avif|jpg)$/)
        expect(existsSync(fileURLToPath(new URL(`../../public${path}`, import.meta.url)))).toBe(
          true,
        )
      }
  })
  it('cubre cada carta con imagen local y conserva los datos de la presentación renderizada', () => {
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
      // Incluye las copias con letra (El Extranjero 03047a–c, Susurros 03084a–d, Penumbrosa
      // Carcosa 03327a–f).
      if (/^\d{5}[a-f]?b?$/.test(code))
        for (const locale of ['en', 'es'])
          expect(cardImages(code, false, locale).length, `${locale}/${code}`).toBeGreaterThan(0)
      if (rendered.has(code)) {
        for (const locale of ['en', 'es']) {
          const card = catalogue[locale]!.get(code)!
          expect(card.name, code).toBeTruthy()
          expect(card.text, code).toBeTruthy()
          if (
            ['skill', 'investigator', 'treachery', 'enemy'].includes(card.type_code) ||
            isPermanent(code) ||
            playerCardBehavior(code)?.dilemma ||
            // Debilidades de apoyo sin coste impreso (Barón Samedi).
            (playerCardDef(code)?.weakness && playerCardDef(code)?.cost === undefined)
          )
            expect(card.cost, code).toBeUndefined()
          else expect(card.cost, code).toBeTypeOf('number')
        }
      }
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
    // 01096 y 01596 (sin imagen) son la misma carta que 12097.
    for (const reprint of ['01096', '01596'])
      expect(cardImages(reprint, false, 'es')).toEqual(cardImages('12097', false, 'es'))
    expect(cardImages('12097', false, 'es').length).toBeGreaterThan(0)
  })
  it('Constance Dumaine (03076a) tiene su Historia (03076b) como reverso', () => {
    expect(cardImages('03076a', false, 'es')).toEqual([
      '/local-assets/cards/es/03076a.avif',
      '/local-assets/cards/en/03076a.avif',
    ])
    expect(cardImages('03076a', true, 'en')).toEqual(['/local-assets/cards/en/03076b.avif'])
  })
  it('no solicita traducciones ausentes de Gala ni pierde su segunda cara especial', () => {
    expect(cardImages('71008', false, 'es')).toEqual(['/local-assets/cards/en/71008.avif'])
    expect(cardImages('71045b', false, 'es')).toEqual(['/local-assets/cards/en/71045b.avif'])
  })
  it('Fortuna conserva sus escaneos ingleses y ambas caras cuando no hay escaneo español', () => {
    for (const art of ['88001', '88001b', '88010', '88010b', '88035a', '88040c', '88053a']) {
      expect(cardImages(art, false, 'es')).toEqual([`/local-assets/cards/en/${art}.avif`])
    }
    expect(cardImages('88001', true, 'es')).toEqual(['/local-assets/cards/en/88001b.avif'])
    const spanish = new Map(fallbackCards('es').map((card) => [card.code, card]))
    expect(spanish.get('88001')!.name).toBe('Fortuna e insensatez')
    expect(spanish.get('88011')!.back_flavor).toBeTruthy()
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
