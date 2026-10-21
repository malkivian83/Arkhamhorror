import { afterEach, describe, expect, it, vi } from 'vitest'
import { messages } from '@lcg/i18n'
import { fallbackCards } from './fallbackCards'

afterEach(() => vi.unstubAllGlobals())
const codes = Array.from({ length: 62 }, (_, n) => String(71001 + n))
const doubleFaced = [
  '71015',
  '71016',
  '71021',
  '71022',
  '71027',
  '71028',
  '71033',
  '71034',
  '71039',
  '71040',
  '71045',
  '71046',
]

describe('G18: respaldo completo de La Gala, EN/ES', () => {
  for (const locale of ['en', 'es'] as const) {
    it.each(codes)(`${locale}: %s tiene nombre y resumen específicos sin red`, (code) => {
      const cards = new Map(fallbackCards(locale).map((c) => [c.code, c]))
      const c = cards.get(code)!
      expect(c).toBeDefined()
      expect(c.name).toBe(
        messages[locale].galaCards[code as keyof typeof messages.en.galaCards].name,
      )
      expect(c.real_name).toBeTruthy()
      expect(c.type_name).toBeTruthy()
      expect(c.text!.length).toBeGreaterThan(30)
      expect(c.text).not.toBe(messages[locale].offlineCard.help)
      expect(c.back_text!.length).toBeGreaterThan(30)
    })
    it(`${locale}: caras mecánicas diferenciadas y reversibles`, () => {
      const cards = new Map(fallbackCards(locale).map((c) => [c.code, c]))
      for (const code of doubleFaced) {
        const front = cards.get(code)!,
          back = cards.get(`${code}b`)!
        expect(back).toBeDefined()
        expect(back.text).toBe(front.back_text)
        expect(back.back_text).toBe(front.text)
        expect(back.text).not.toBe(front.text)
      }
      expect(cards.get('71045')).toMatchObject({
        enemy_fight: 4,
        health: 3,
        health_per_investigator: true,
      })
      expect(cards.get('71045b')).toMatchObject({ enemy_fight: 3, health: 6, victory: 1 })
      expect(cards.get('71016')).toMatchObject({ type_code: 'asset', health: 2, sanity: 3 })
      expect(cards.get('71016b')).toMatchObject({
        type_code: 'enemy',
        enemy_fight: 2,
        enemy_evade: 3,
      })
      expect(cards.get('71052')!.type_code).toBe('asset')
      expect(cards.get('71008')).toMatchObject({ shroud: 5, clues: 2, clues_fixed: false })
      expect(cards.get('71002')!.doom).toBe(4)
      expect(cards.get('71005')!.clues).toBe(3)
    })
  }
  it('red caída, JSON inválido y recursos ausentes conservan el catálogo completo', async () => {
    vi.resetModules()
    const { useCardLocale, localizedCards, localName } = await import('./localized')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    await useCardLocale('es')
    expect(codes.filter((code) => !localizedCards.value.get(code)?.text)).toEqual([])
    expect(localizedCards.value.get('71008')!.name).toBe('Sala de la Lámpara')
    expect(localName('Carl Sanford')).toBe('Carl Sanford')
    expect(localName('The Bloodless Man')).toBe('El Exangüe')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ invalid: true }) }),
    )
    await useCardLocale('es')
    expect(localizedCards.value.get('71045b')!.text).toContain('Descomunal')
    const { cardImages } = await import('./cards')
    // Missing scan: text remains independently available, no network request for an image.
    expect(cardImages('71062', true, 'es')).toEqual([])
    expect(localizedCards.value.get('71062')!.text).toContain('amenaza')
    expect(localizedCards.value.get('71015b')!.text).toContain('Rival')
  })
  it('una respuesta parcial no borra las cifras ni el resumen del reverso local', async () => {
    vi.resetModules()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { code: '71045', name: 'El Exangüe', type_code: 'enemy', text: '', back_text: '' },
        ],
      }),
    )
    const { useCardLocale, localizedCards } = await import('./localized')
    await useCardLocale('es')
    expect(localizedCards.value.get('71045')).toMatchObject({ enemy_fight: 4, health: 3 })
    expect(localizedCards.value.get('71045')!.text).toContain('Acechador')
    expect(localizedCards.value.get('71045')!.back_text).toContain('Descomunal')
  })
  it('un cambio de idioma conserva las dos caras y una respuesta ES tardía no pisa EN', async () => {
    vi.resetModules()
    const { useCardLocale, localizedCards } = await import('./localized')
    const responses: ((response: unknown) => void)[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => new Promise((resolve) => responses.push(resolve))),
    )
    const spanish = useCardLocale('es')
    expect(localizedCards.value.get('71046b')!.text).toContain('hechizada')
    const english = useCardLocale('en')
    responses.forEach((resolve) => resolve({ ok: true, json: async () => [] }))
    await Promise.all([spanish, english])
    expect(localizedCards.value.get('71008')!.name).toBe('Lantern Chamber')
    expect(localizedCards.value.get('71046b')!.text).toContain('spellbound')
  })
})
