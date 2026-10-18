import {
  playerCards,
  SPREADING_FLAMES_CODES,
  SMOKE_AND_MIRRORS_CODES,
  QUEEN_OF_ASH_CODES,
} from '@lcg/cards'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fallbackCards } from './fallbackCards'
import { cardImage } from './cards'
import { localizedCards, useCardLocale } from './localized'

afterEach(() => vi.unstubAllGlobals())
describe('recursos de cartas sin red', () => {
  for (const locale of ['en', 'es'])
    it(`${locale}: datos locales para todas las cartas de la campaña`, () => {
      const cards = new Map(fallbackCards(locale).map((c) => [c.code, c]))
      const codes = [
        ...playerCards.map((c) => c.code),
        ...Object.values(SPREADING_FLAMES_CODES),
        ...Object.values(SMOKE_AND_MIRRORS_CODES),
        ...Object.values(QUEEN_OF_ASH_CODES),
      ]
      expect(codes.filter((code) => !cards.has(code))).toEqual([])
      expect([...cards.values()].every((c) => c.name && c.type_name && c.text && c.back_text)).toBe(
        true,
      )
      expect(cards.get('12111')!.back_text).toContain(locale === 'es' ? 'Armitage' : 'Armitage')
      expect(cards.get('12179b')!.type_code).toBe('enemy')
    })
  it('una traducción remota ausente mantiene datos y resúmenes locales', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    await useCardLocale('es')
    expect(localizedCards.value.get('12109')?.text).toContain('pistas')
    expect(localizedCards.value.get('12019')?.cost).toBe(3)
  })
  it('un JSON remoto inválido no sustituye las cartas locales', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ broken: true }) }),
    )
    await useCardLocale('es')
    expect(localizedCards.value.has('12179')).toBe(true)
  })
  it('una descarga ES tardía no pisa un cambio posterior a EN', async () => {
    const responses: ((value: unknown) => void)[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        () =>
          new Promise((done) => {
            responses.push(done)
          }),
      ),
    )
    const spanish = useCardLocale('es')
    await useCardLocale('en')
    const response = {
      ok: true,
      json: async () => [
        {
          code: '12004',
          name: 'Nombre remoto',
          real_name: 'Joe Diamond',
          type_code: 'investigator',
        },
      ],
    }
    responses.forEach((resolve) => resolve(response))
    await spanish
    expect(localizedCards.value.get('12004')?.name).toBe('Joe Diamond')
  })
  it('Mother of Flame usa el reverso de Elokoss al mostrar su código de segunda cara', () => {
    expect(cardImage('12179b')).toContain('12179b.jpg')
    expect(cardImage('12179b', true)).toContain('12179.jpg')
  })
  it('las segundas caras de La Gala conservan el servidor de imágenes de referencia', () => {
    expect(cardImage('71045b')).toBe('https://assets.arkhamhorror.app/img/arkham/cards/71045b.avif')
    expect(cardImage('71045b', true)).toContain('71045.jpg')
  })
})
