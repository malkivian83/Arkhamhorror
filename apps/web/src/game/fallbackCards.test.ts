import {
  playerCards,
  SPREADING_FLAMES_CODES,
  SMOKE_AND_MIRRORS_CODES,
  QUEEN_OF_ASH_CODES,
} from '@lcg/cards'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fallbackCards } from './fallbackCards'
import { cardImage, cardImages } from './cards'
import { localizedCards, useCardLocale } from './localized'

afterEach(() => vi.unstubAllGlobals())
describe('recursos de cartas sin red', () => {
  it.each(['03191', '52003'])(
    '%s presents Logical Reasoning in both languages with the correct level',
    (code) => {
      for (const locale of ['en', 'es']) {
        const card = fallbackCards(locale).find((c) => c.code === code)!
        expect(card.name).toBe(locale === 'es' ? 'Razonamiento lógico' : 'Logical Reasoning')
        expect(card.type_code).toBe('event')
        expect(card.xp).toBe(code === '03191' ? 0 : 4)
        expect(card.skill_willpower).toBe(code === '03191' ? 2 : 3)
        expect(card.cost).toBe(2)
        expect(card.text).toContain('[[Terror]]')
        expect(card.text).toContain(locale === 'es' ? 'pista' : 'clue')
        expect(cardImages(code, false, locale)[0]).toBe(
          '/local-assets/cards/' + locale + '/' + code + '.avif',
        )
      }
    },
  )
  it.each(['04036', '11093'])(
    '%s presents official EN/ES rules and the correct upgraded icons',
    (code) => {
      for (const locale of ['en', 'es']) {
        const card = fallbackCards(locale).find((c) => c.code === code)!
        expect(card.name).toBe(locale === 'es' ? 'Última oportunidad' : 'Last Chance')
        expect(card.skill_wild).toBe(code === '04036' ? 5 : 6)
        expect(card.xp).toBe(code === '04036' ? 0 : 3)
        expect(card.text).toContain('[wild]')
        expect(card.text).toContain(locale === 'es' ? 'otras cartas' : 'Other cards')
        expect(cardImages(code, false, locale)[0]).toBe(
          '/local-assets/cards/' + locale + '/' + code + '.avif',
        )
      }
    },
  )
  it.each(['09030', '11088', '60268', '60269'])(
    '%s has official EN/ES names, rules and local scans',
    (code) => {
      const english = fallbackCards('en').find((c) => c.code === code)!
      const spanish = fallbackCards('es').find((c) => c.code === code)!
      expect(english.type_code).toBe('skill')
      expect(spanish.name).not.toBe(english.name)
      expect(spanish.text).not.toBe(english.text)
      expect(english.text?.length ?? 0).toBeGreaterThan(30)
      expect(spanish.text?.length ?? 0).toBeGreaterThan(30)
      for (const locale of ['en', 'es'])
        expect(cardImages(code, false, locale)[0]).toBe(
          `/local-assets/cards/${locale}/${code}.avif`,
        )
      if (code === '11088') {
        expect(spanish.skill_wild).toBeUndefined()
        expect(spanish.skill_intellect).toBeUndefined()
      }
    },
  )
  it('presents Mind over Matter with official EN/ES rules, icons and local scans', () => {
    for (const locale of ['en', 'es']) {
      const card = fallbackCards(locale).find((c) => c.code === '01036')!
      expect(card.name).toBe(locale === 'es' ? 'La mente sobre la materia' : 'Mind over Matter')
      expect(card.text).toContain(locale === 'es' ? 'final de la ronda' : 'end of the round')
      expect(card.text).toContain('[intellect]')
      expect(card.skill_combat).toBe(1)
      expect(card.skill_agility).toBe(1)
      expect(card.cost).toBe(1)
      expect(cardImages('01036', false, locale)[0]).toBe(`/local-assets/cards/${locale}/01036.avif`)
    }
  })
  it('presents Fight or Flight with official EN/ES rules and local scans', () => {
    for (const locale of ['en', 'es']) {
      const card = fallbackCards(locale).find((c) => c.code === '03155')!
      expect(card.name).toBe(locale === 'es' ? 'Pelear o huir' : 'Fight or Flight')
      expect(card.text).toContain(locale === 'es' ? 'final de la ronda' : 'end of the round')
      expect(card.text).toContain('[combat]')
      expect(card.cost).toBe(1)
      expect(cardImages('03155', false, locale)[0]).toBe(`/local-assets/cards/${locale}/03155.avif`)
    }
  })
  it('serves the reference application scans for Pete, both sides, Duke and the weakness in EN/ES', () => {
    for (const language of ['en', 'es'])
      for (const code of ['02005', '02014', '02015'])
        expect(cardImages(code, false, language)[0]).toBe(
          `/local-assets/cards/${language}/${code}.avif`,
        )
    expect(cardImages('02005', true, 'es')[0]).toBe('/local-assets/cards/es/02005b.avif')
    expect(cardImages('02005', true, 'en')[0]).toBe('/local-assets/cards/en/02005b.avif')
  })
  it('renders Pete, Duke and his weakness in both languages, including investigator stats and deck rules', () => {
    for (const locale of ['en', 'es']) {
      const cards = new Map(fallbackCards(locale).map((c) => [c.code, c]))
      const pete = cards.get('02005')!
      expect(pete.type_code).toBe('investigator')
      expect(pete.skill_willpower).toBe(4)
      expect(pete.skill_combat).toBe(2)
      expect(pete.health).toBe(6)
      expect(pete.sanity).toBe(5)
      expect(pete.text).toContain('Duke')
      expect(pete.back_text).toContain('30')
      expect(cards.get('02014')!.health).toBe(2)
      expect(cards.get('02014')!.sanity).toBe(3)
      expect(cards.get('02015')!.text).toBeTruthy()
    }
  })
  it('presents Jenny Barnes and the decklist 1179 cards with official scans, X cost and EN/ES names', () => {
    for (const language of ['en', 'es']) {
      for (const code of ['02003', '02010', '02011', '01024', '01050', '02147'])
        expect(cardImages(code, false, language)[0]).toBe(
          `/local-assets/cards/${language}/${code}.avif`,
        )
      expect(cardImages('02003', true, language)[0]).toBe(
        `/local-assets/cards/${language}/02003b.avif`,
      )
      const cards = new Map(fallbackCards(language).map((c) => [c.code, c]))
      const jenny = cards.get('02003')!
      expect([jenny.skill_willpower, jenny.skill_agility, jenny.health, jenny.sanity]).toEqual([
        3, 3, 8, 7,
      ])
      expect(jenny.back_text).toContain('30')
      expect(cards.get('02010')!.cost).toBe(-2)
    }
    const spanish = new Map(fallbackCards('es').map((c) => [c.code, c]))
    expect(spanish.get('02010')!.name).toBe('.45 gemelas de Jenny')
    expect(spanish.get('02147')!.name).toBe('Bandolera')
    expect(spanish.get('02011')!.text).toContain('Izzie')
  })
  it('presenta las siete cartas del piloto en EN/ES sin imágenes ni peticiones externas', () => {
    const spanish = new Map(fallbackCards('es').map((card) => [card.code, card]))
    const english = new Map(fallbackCards('en').map((card) => [card.code, card]))
    expect(spanish.get('02105')?.name).toBe('Cura de urgencia')
    expect(english.get('02105')?.name).toBe('Emergency Aid')
    for (const code of ['02020', '02030', '02033', '02105', '02109', '02116', '02117']) {
      expect(spanish.get(code)?.text).toBeTruthy()
      expect(english.get(code)?.text).toBeTruthy()
      expect(spanish.get(code)?.cost).toBe(english.get(code)?.cost)
    }
  })
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
    const english = useCardLocale('en')
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
    await Promise.all([spanish, english])
    expect(localizedCards.value.get('12004')?.name).toBe('Joe Diamond')
  })
  it('Mother of Flame usa el reverso de Elokoss al mostrar su código de segunda cara', () => {
    expect(cardImage('12179b')).toBe('/local-assets/cards/en/12179b.avif')
    expect(cardImage('12179b', true)).toBe('/local-assets/cards/en/12179.avif')
  })
  it('las segundas caras de La Gala se sirven desde nuestro almacenamiento local', () => {
    expect(cardImage('71045b')).toBe('/local-assets/cards/en/71045b.avif')
    expect(cardImage('71045b', true)).toBe('/local-assets/cards/en/71045.avif')
  })
})
