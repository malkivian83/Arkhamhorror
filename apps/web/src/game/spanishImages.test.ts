import { describe, expect, it } from 'vitest'
import { cardImages } from './cards'
import manifest from './cardImageManifest.json'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { fallbackCards } from './fallbackCards'

describe('imágenes españolas de referencia y alternativas', () => {
  it('el manifiesto solo contiene archivos presentes que se sirven desde nuestra web', () => {
    for (const paths of Object.values(manifest))
      for (const path of Object.values(paths)) {
        expect(path).toMatch(/^\/local-assets\/cards\/(en|es)\/\d{5}b?\.(avif|jpg)$/)
        expect(existsSync(fileURLToPath(new URL(`../../public${path}`, import.meta.url)))).toBe(
          true,
        )
      }
  })
  it('incluye todas las cartas principales de nuestro contenido y los 62 códigos de Gala', () => {
    const codes = new Set(fallbackCards('en').map((c) => c.code))
    for (let n = 1; n <= 62; n++) codes.add(`71${String(n).padStart(3, '0')}`)
    for (const code of codes)
      if (/^\d{5}b?$/.test(code))
        expect(cardImages(code, false, 'en').length, code).toBeGreaterThan(0)
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
  it('no solicita traducciones ausentes de Gala ni pierde su segunda cara especial', () => {
    expect(cardImages('71008', false, 'es')).toEqual(['/local-assets/cards/en/71008.avif'])
    expect(cardImages('71045b', false, 'es')).toEqual(['/local-assets/cards/en/71045b.avif'])
  })
  it('respeta las caras invertidas de Brethren y los códigos de segunda cara', () => {
    expect(cardImages('12116', false, 'es')[0]).toContain('/local-assets/cards/es/12116b.avif')
    expect(cardImages('12116', true, 'es')[0]).toContain('/local-assets/cards/es/12116.avif')
    expect(cardImages('12179b', true, 'es')[0]).toContain('/local-assets/cards/es/12179.avif')
    expect(cardImages('invalid', false, 'es')).toEqual([])
  })
})
